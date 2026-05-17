"""
Image upload and prediction router.
Handles file upload, validation, inference, and prediction history.
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Form, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies import get_current_user
from ..schemas import InferenceResult, PredictionHistoryItem, PredictionHistoryResponse, MessageResponse
from ...services.upload_service import validate_file, save_upload, delete_upload_file, get_upload_by_id
from ...services.inference import run_prediction_and_persist
from ...services.analytics_service import track_event
from ...models.db_models import User, Prediction, Upload

logger = logging.getLogger("DeepTrace.image.router")

router = APIRouter(prefix="/api/v1/image", tags=["Image Detection"])


@router.post("/predict", response_model=InferenceResult, responses={
    400: {"description": "Invalid image format or inference error"},
    401: {"description": "Not authenticated"},
    422: {"description": "Validation Error"},
    500: {"description": "Internal server error during prediction"}
})
async def predict_image(
    file: UploadFile = File(...),
    explain: bool = Form(True),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Upload an image and get AI-generated detection results.
    Requires authentication. Results are persisted to user history.
    """
    # Read file contents
    contents = await file.read()
    file_size = len(contents)

    # Validate file
    errors = validate_file(file.filename or "unknown", file.content_type or "", file_size)
    if errors:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="; ".join(errors))

    try:
        # Track the prediction request
        track_event(db, "prediction_request", user_id=current_user.id, metadata={
            "filename": file.filename,
            "file_size": file_size,
        })

        # Save the upload
        upload = save_upload(
            db,
            user_id=current_user.id,
            filename=file.filename or "unknown",
            content_type=file.content_type or "image/jpeg",
            file_bytes=contents,
        )

        # Run inference and persist
        result = run_prediction_and_persist(
            db,
            user_id=current_user.id,
            upload_id=upload.id,
            image_bytes=contents,
        )

        # Track success
        track_event(db, "prediction_success", user_id=current_user.id, metadata={
            "prediction_id": result["id"],
            "is_ai_generated": result["is_ai_generated"],
            "confidence": result["confidence"],
        })

        return InferenceResult(
            id=result["id"],
            is_ai_generated=result["is_ai_generated"],
            confidence=result["confidence"],
            model_version=result["model_version"],
            scores=result["scores"],
            explanation=result["explanation"],
            warnings=result.get("warnings", []),
            inference_ms=result["inference_ms"],
            upload_id=upload.id,
            original_filename=file.filename,
        )

    except ValueError as ve:
        logger.warning(f"Inference validation error: {ve}")
        track_event(db, "prediction_warning", user_id=current_user.id, metadata={"error": str(ve)})
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        logger.error(f"Prediction failed: {e}", exc_info=True)
        track_event(db, "prediction_error", user_id=current_user.id, metadata={"error": str(e)})
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Prediction failed. Please try again.")


@router.get("/history", response_model=PredictionHistoryResponse)
async def get_prediction_history(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get the current user's prediction history."""
    query = (
        db.query(Prediction, Upload)
        .join(Upload, Prediction.upload_id == Upload.id)
        .filter(Prediction.user_id == current_user.id)
        .order_by(Prediction.created_at.desc())
    )

    total = query.count()
    results = query.offset((page - 1) * per_page).limit(per_page).all()

    items = []
    for pred, upload in results:
        items.append(PredictionHistoryItem(
            id=pred.id,
            upload_id=upload.id,
            is_ai_generated=pred.is_ai_generated,
            confidence=pred.confidence,
            model_version=pred.model_version,
            inference_ms=pred.inference_ms,
            warnings=pred.warnings or [],
            original_filename=upload.original_filename,
            file_size_bytes=upload.file_size_bytes,
            created_at=pred.created_at,
        ))

    return PredictionHistoryResponse(
        predictions=items,
        total=total,
        page=page,
        per_page=per_page,
    )


@router.get("/history/{prediction_id}", response_model=InferenceResult, responses={
    401: {"description": "Not authenticated"},
    403: {"description": "Not authorized to view this prediction"},
    404: {"description": "Prediction not found"}
})
async def get_prediction_detail(
    prediction_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get full details of a specific prediction including explainability data."""
    prediction = (
        db.query(Prediction)
        .filter(Prediction.id == prediction_id, Prediction.user_id == current_user.id)
        .first()
    )
    if not prediction:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prediction not found")

    upload = db.query(Upload).filter(Upload.id == prediction.upload_id).first()

    # Re-generate explanation maps from the stored image
    explanation = {"saliency_png_base64": "", "frequency_map_png_base64": ""}
    if upload:
        try:
            import os
            if os.path.exists(upload.stored_path):
                with open(upload.stored_path, "rb") as f:
                    image_bytes = f.read()
                from ...services.inference import run_prediction
                temp_result = run_prediction(image_bytes, return_explanation=True)
                explanation = temp_result["explanation"]
        except Exception as e:
            logger.warning(f"Could not regenerate explanation: {e}")

    return InferenceResult(
        id=prediction.id,
        is_ai_generated=prediction.is_ai_generated,
        confidence=prediction.confidence,
        model_version=prediction.model_version,
        scores=prediction.scores,
        explanation=explanation,
        warnings=prediction.warnings or [],
        inference_ms=prediction.inference_ms,
        upload_id=prediction.upload_id,
        original_filename=upload.original_filename if upload else None,
        created_at=prediction.created_at,
    )


@router.delete("/history/{prediction_id}", response_model=MessageResponse, responses={
    401: {"description": "Not authenticated"},
    403: {"description": "Not authorized to delete this prediction"},
    404: {"description": "Prediction not found"}
})
async def delete_prediction(
    prediction_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a prediction and its associated upload."""
    prediction = (
        db.query(Prediction)
        .filter(Prediction.id == prediction_id, Prediction.user_id == current_user.id)
        .first()
    )
    if not prediction:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prediction not found")

    # Delete upload file and record
    upload = db.query(Upload).filter(Upload.id == prediction.upload_id).first()
    if upload:
        delete_upload_file(upload)
        db.delete(upload)

    db.delete(prediction)
    db.commit()

    return MessageResponse(message="Prediction deleted successfully")
