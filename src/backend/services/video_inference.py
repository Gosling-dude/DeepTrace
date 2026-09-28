"""
Video deepfake inference pipeline with DB persistence.
End-to-end: bytes → frame sampling → per-frame ensemble → temporal analysis → fusion → persist.
"""

import time
import logging
from sqlalchemy.orm import Session

from .preprocess import get_base64_from_array
from .video_preprocess import sample_video, compute_temporal_features, read_single_frame, SampledFrame
from ..app.config import get_settings
from ..models.video_core import get_video_detector, aggregate_frame_scores, VIDEO_MODEL_VERSION
from ..models.explainability import generate_spatial_mock_gradcam, generate_frequency_overlay
from ..models.db_models import VideoPrediction, generate_uuid

logger = logging.getLogger("DeepTrace.video.inference")
settings = get_settings()

EMPTY_EXPLANATION = {
    "keyframe_png_base64": "",
    "saliency_png_base64": "",
    "frequency_map_png_base64": "",
}


def build_keyframe_explanation(frame: SampledFrame, score: float) -> dict:
    """Visual evidence for the most suspicious frame."""
    return {
        "keyframe_png_base64": get_base64_from_array(_thumbnail(frame)),
        "saliency_png_base64": get_base64_from_array(generate_spatial_mock_gradcam(frame.face, score)),
        "frequency_map_png_base64": get_base64_from_array(generate_frequency_overlay(frame.face)),
    }


def _thumbnail(frame: SampledFrame, max_side: int = 640):
    import numpy as np
    import cv2

    img = frame.frame.copy()
    img.thumbnail((max_side, max_side))
    arr = np.array(img)
    if frame.face_box is not None:
        sx = img.size[0] / frame.frame.size[0]
        sy = img.size[1] / frame.frame.size[1]
        x, y, w, h = frame.face_box
        cv2.rectangle(
            arr, (int(x * sx), int(y * sy)), (int((x + w) * sx), int((y + h) * sy)), (244, 63, 94), 2
        )
    return arr


def _collect_warnings(sample, frames) -> list[str]:
    warnings = []
    if not any(f.face_detected for f in frames):
        warnings.append("No faces detected. Deepfake analysis is most reliable on videos with visible faces.")
    elif sum(f.face_detected for f in frames) < len(frames) / 2:
        warnings.append("Faces were detected in fewer than half of the sampled frames.")
    if min(sample.width, sample.height) < 240:
        warnings.append("Video resolution is very low. Results may be unreliable.")
    if len(frames) < 4:
        warnings.append("Video is very short; temporal analysis has limited evidence.")
    if sample.duration_s > settings.VIDEO_MAX_DURATION_SECONDS:
        warnings.append(
            f"Video is longer than {settings.VIDEO_MAX_DURATION_SECONDS}s; "
            f"only {len(frames)} frames across the clip were analysed."
        )
    return warnings


def run_video_prediction(video_bytes: bytes, suffix: str = ".mp4", return_explanation: bool = True) -> dict:
    """Run the full video pipeline. Raises ValueError for undecodable input."""
    start = time.time()
    detector = get_video_detector()

    try:
        sample = sample_video(video_bytes, num_frames=settings.VIDEO_SAMPLE_FRAMES, suffix=suffix)
    except ValueError:
        raise
    except Exception as e:
        logger.exception("Video decoding failed")
        raise ValueError(f"Unable to process video: {e}")

    frames = sample.frames
    frame_results = []
    for f in frames:
        res = detector.score_frame(f.face, f.frame)
        frame_results.append({
            "index": f.index,
            "timestamp_s": f.timestamp_s,
            "score": round(float(res["scores"]["ensemble"]), 4),
            "face_detected": f.face_detected,
        })

    frame_agg = aggregate_frame_scores([r["score"] for r in frame_results])
    temporal = compute_temporal_features(frames)
    fake_prob = detector.fuse(frame_agg, temporal)
    is_deepfake = fake_prob > 0.5

    key_pos = max(range(len(frame_results)), key=lambda i: frame_results[i]["score"])
    explanation = dict(EMPTY_EXPLANATION)
    if return_explanation:
        explanation = build_keyframe_explanation(frames[key_pos], frame_results[key_pos]["score"])

    inference_ms = int((time.time() - start) * 1000)
    logger.info(
        f"Video inference: {len(frames)} frames in {inference_ms}ms. Fake probability: {fake_prob:.2f}"
    )

    return {
        "is_deepfake": bool(is_deepfake),
        "confidence": float(max(fake_prob, 1 - fake_prob)),
        "scores": {
            "frame_mean": round(frame_agg["frame_mean"], 4),
            "frame_max": round(frame_agg["frame_max"], 4),
            "frame_topk": round(frame_agg["frame_topk"], 4),
            "temporal": temporal["score"],
            "ensemble": round(fake_prob, 4),
        },
        "temporal": temporal,
        "frame_scores": frame_results,
        "keyframe_index": frame_results[key_pos]["index"],
        "video_meta": sample.meta,
        "explanation": explanation,
        "warnings": _collect_warnings(sample, frames),
        "model_version": VIDEO_MODEL_VERSION,
        "inference_ms": inference_ms,
    }


def persist_video_prediction(db: Session, user_id: str, upload_id: str, result: dict) -> dict:
    """Store a finished video analysis and enrich the result with its DB identifiers."""
    prediction = VideoPrediction(
        id=generate_uuid(),
        upload_id=upload_id,
        user_id=user_id,
        is_deepfake=result["is_deepfake"],
        confidence=result["confidence"],
        scores=result["scores"],
        temporal_features=result["temporal"],
        model_version=result["model_version"],
        inference_ms=result["inference_ms"],
        warnings=result["warnings"],
        video_meta=result["video_meta"],
        frame_scores=result["frame_scores"],
        keyframe_index=result["keyframe_index"],
    )
    db.add(prediction)
    db.commit()
    db.refresh(prediction)

    result["id"] = prediction.id
    result["upload_id"] = upload_id
    result["created_at"] = prediction.created_at
    return result


def rebuild_explanation(stored_path: str, keyframe_index: int | None, frame_scores: list[dict]) -> dict:
    """Regenerate keyframe visuals from the stored video (avoids persisting large blobs)."""
    if keyframe_index is None:
        return dict(EMPTY_EXPLANATION)
    frame = read_single_frame(stored_path, keyframe_index)
    if frame is None:
        return dict(EMPTY_EXPLANATION)
    score = next((f["score"] for f in frame_scores if f["index"] == keyframe_index), 0.5)
    return build_keyframe_explanation(frame, score)
