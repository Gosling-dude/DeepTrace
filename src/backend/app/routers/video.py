"""
Video deepfake detection router.
Handles video upload, validation, frame/temporal inference, and prediction history.
"""

import os
import logging
from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Query
from fastapi.concurrency import run_in_threadpool
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies import get_current_user
from ..schemas import VideoInferenceResult, VideoHistoryItem, VideoHistoryResponse, MessageResponse
from ...services.upload_service import validate_video_file, save_upload, delete_upload_file
from ...services.video_inference import run_video_prediction, persist_video_prediction, rebuild_explanation
from ...services.analytics_service import track_event
from ...models.db_models import User, VideoPrediction, Upload

logger = logging.getLogger("DeepTrace.video.router")

router = APIRouter(prefix="/api/v1/video", tags=["Video Deepfake Detection"])


def _suffix(filename: str) -> str:
    return "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ".mp4"


def _get_owned_prediction(db: Session, prediction_id: str, user_id: str) -> VideoPrediction:
    prediction = (
        db.query(VideoPrediction)
        .filter(VideoPrediction.id == prediction_id, VideoPrediction.user_id == user_id)
        .first()
    )
    if not prediction:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video prediction not found")
    return prediction


@router.post("/predict", response_model=VideoInferenceResult, responses={
    400: {"description": "Invalid video format or undecodable video"},
    401: {"description": "Not authenticated"},
    422: {"description": "Validation Error"},
    500: {"description": "Internal server error during prediction"}
})
async def predict_video(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Upload a video and get a deepfake verdict with per-frame scores, temporal
    consistency features, and visual evidence for the most suspicious frame.
    """
    contents = await file.read()
    filename = file.filename or "unknown"
    content_type = file.content_type or ""

    errors = validate_video_file(filename, content_type, len(contents))
    if errors:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="; ".join(errors))

    track_event(db, "video_prediction_request", user_id=current_user.id, metadata={
        "filename": filename,
        "file_size": len(contents),
    })

    try:
        # Decoding + per-frame inference is CPU bound; keep the event loop free.
        result = await run_in_threadpool(run_video_prediction, contents, _suffix(filename))
    except ValueError as ve:
        logger.warning(f"Video validation error: {ve}")
        track_event(db, "video_prediction_warning", user_id=current_user.id, metadata={"error": str(ve)})
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        logger.error(f"Video prediction failed: {e}", exc_info=True)
        track_event(db, "video_prediction_error", user_id=current_user.id, metadata={"error": str(e)})
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Video analysis failed. Please try again."
        )

    # Only store videos we could actually analyse.
    upload = save_upload(
        db,
        user_id=current_user.id,
        filename=filename,
        content_type=content_type or "video/mp4",
        file_bytes=contents,
    )
    result = persist_video_prediction(db, current_user.id, upload.id, result)

    track_event(db, "video_prediction_success", user_id=current_user.id, metadata={
        "prediction_id": result["id"],
        "is_deepfake": result["is_deepfake"],
        "confidence": result["confidence"],
    })

    return VideoInferenceResult(**result, original_filename=filename)


@router.get("/history", response_model=VideoHistoryResponse)
async def get_video_history(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get the current user's video prediction history."""
    query = (
        db.query(VideoPrediction, Upload)
        .join(Upload, VideoPrediction.upload_id == Upload.id)
        .filter(VideoPrediction.user_id == current_user.id)
        .order_by(VideoPrediction.created_at.desc())
    )

    total = query.count()
    rows = query.offset((page - 1) * per_page).limit(per_page).all()

    items = [
        VideoHistoryItem(
            id=pred.id,
            upload_id=upload.id,
            is_deepfake=pred.is_deepfake,
            confidence=pred.confidence,
            model_version=pred.model_version,
            inference_ms=pred.inference_ms,
            warnings=pred.warnings or [],
            duration_s=(pred.video_meta or {}).get("duration_s", 0.0),
            original_filename=upload.original_filename,
            file_size_bytes=upload.file_size_bytes,
            created_at=pred.created_at,
        )
        for pred, upload in rows
    ]

    return VideoHistoryResponse(predictions=items, total=total, page=page, per_page=per_page)


@router.get("/history/{prediction_id}", response_model=VideoInferenceResult, responses={
    401: {"description": "Not authenticated"},
    404: {"description": "Video prediction not found"}
})
async def get_video_prediction_detail(
    prediction_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Full details of a video prediction, regenerating keyframe visuals from the stored video."""
    prediction = _get_owned_prediction(db, prediction_id, current_user.id)
    upload = db.query(Upload).filter(Upload.id == prediction.upload_id).first()

    explanation = None
    if upload and os.path.exists(upload.stored_path):
        try:
            explanation = await run_in_threadpool(
                rebuild_explanation, upload.stored_path, prediction.keyframe_index, prediction.frame_scores or []
            )
        except Exception as e:
            logger.warning(f"Could not regenerate video explanation: {e}")

    return VideoInferenceResult(
        id=prediction.id,
        is_deepfake=prediction.is_deepfake,
        confidence=prediction.confidence,
        model_version=prediction.model_version,
        scores=prediction.scores,
        temporal=prediction.temporal_features,
        frame_scores=prediction.frame_scores or [],
        keyframe_index=prediction.keyframe_index,
        video_meta=prediction.video_meta,
        explanation=explanation or {
            "keyframe_png_base64": "", "saliency_png_base64": "", "frequency_map_png_base64": "",
        },
        warnings=prediction.warnings or [],
        inference_ms=prediction.inference_ms,
        upload_id=prediction.upload_id,
        original_filename=upload.original_filename if upload else None,
        created_at=prediction.created_at,
    )


@router.delete("/history/{prediction_id}", response_model=MessageResponse, responses={
    401: {"description": "Not authenticated"},
    404: {"description": "Video prediction not found"}
})
async def delete_video_prediction(
    prediction_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a video prediction and its stored video."""
    prediction = _get_owned_prediction(db, prediction_id, current_user.id)

    upload = db.query(Upload).filter(Upload.id == prediction.upload_id).first()
    if upload:
        delete_upload_file(upload)
        db.delete(upload)

    db.delete(prediction)
    db.commit()

    return MessageResponse(message="Video prediction deleted successfully")
