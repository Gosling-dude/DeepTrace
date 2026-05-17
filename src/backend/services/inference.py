"""
Refactored inference pipeline with DB persistence.
End-to-end: bytes → preprocess → model → explainability → persist → return.
"""

import time
import logging
from sqlalchemy.orm import Session

from .preprocess import load_image, detect_face, preprocess_for_spatial, compute_frequency_spectrum, get_base64_from_array
from ..models.core import get_ensemble
from ..models.explainability import generate_spatial_mock_gradcam, generate_frequency_overlay
from ..models.db_models import Prediction, generate_uuid

logger = logging.getLogger("DeepTrace.inference")


def run_prediction(image_bytes: bytes, return_explanation: bool = False) -> dict:
    """
    End-to-end pipeline: bytes -> prediction -> explanation maps.
    Returns a dict suitable for the InferenceResult schema.
    """
    start_time = time.time()
    warnings = []

    try:
        # 1. Load Image
        img = load_image(image_bytes)

        # 2. Check for compression / size anomalies
        if len(image_bytes) < 50_000:  # < 50KB might be highly compressed
            warnings.append("Low image quality or highly compressed. Prediction may be degraded.")

        # Check for very small images
        width, height = img.size
        if width < 64 or height < 64:
            warnings.append("Image resolution is very low. Results may be unreliable.")

        # 3. Preprocess Pipeline
        face_img = detect_face(img)
        spatial_tensor = preprocess_for_spatial(face_img)

        # For frequency, we want the whole image to catch jpeg grid anomalies
        freq_tensor = compute_frequency_spectrum(img)

        # 4. Neural Network Inference
        model = get_ensemble()
        result = model.predict_ensemble(spatial_tensor, freq_tensor)

        # Append warnings
        result["warnings"] = warnings

        # 5. Explainability (conditional to save compute)
        explanations = {
            "saliency_png_base64": "",
            "frequency_map_png_base64": "",
        }

        if return_explanation:
            logger.info("Generating explanation heatmaps...")
            saliency_overlay = generate_spatial_mock_gradcam(face_img, result["scores"]["ensemble"])
            frequency_overlay = generate_frequency_overlay(img)

            explanations["saliency_png_base64"] = get_base64_from_array(saliency_overlay)
            explanations["frequency_map_png_base64"] = get_base64_from_array(frequency_overlay)

        result["explanation"] = explanations
        
        # Calculate execution time
        exec_time_ms = round((time.time() - start_time) * 1000, 2)
        result["inference_ms"] = exec_time_ms
        
        logger.info(f"Inference completed in {exec_time_ms}ms. AI Probability: {result['confidence']:.2f}")
        return result
        
    except ValueError as ve:
        logger.error(f"Validation Error during inference: {ve}")
        raise ValueError(f"Image processing failed: {str(ve)}. Please try a different image.")
    except Exception as e:
        logger.exception("Fatal error during model inference pipeline.")
        raise RuntimeError("The inference engine encountered an unexpected error. Our team has been notified.")


def run_prediction_and_persist(
    db: Session,
    user_id: str,
    upload_id: str,
    image_bytes: bytes,
) -> dict:
    """
    Run the full inference pipeline and persist results to the database.
    Always generates explainability data for persisted predictions.
    """
    start_time = time.time()

    # Run inference with explanation always enabled for persisted predictions
    result = run_prediction(image_bytes, return_explanation=True)

    end_time = time.time()
    inference_ms = int((end_time - start_time) * 1000)

    # Create prediction record
    prediction_id = generate_uuid()
    prediction = Prediction(
        id=prediction_id,
        upload_id=upload_id,
        user_id=user_id,
        is_ai_generated=result["is_ai_generated"],
        confidence=result["confidence"],
        scores=result["scores"],
        model_version="v1.0.0",
        inference_ms=inference_ms,
        warnings=result.get("warnings", []),
    )
    db.add(prediction)
    db.commit()
    db.refresh(prediction)

    logger.info(
        f"Prediction {prediction_id}: "
        f"{'AI' if result['is_ai_generated'] else 'Real'} "
        f"({result['confidence']:.1%}) in {inference_ms}ms"
    )

    # Return enriched result
    result["id"] = prediction_id
    result["upload_id"] = upload_id
    result["model_version"] = "v1.0.0"
    result["inference_ms"] = inference_ms

    return result
