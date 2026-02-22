import logging
from .preprocess import load_image, detect_face, preprocess_for_spatial, compute_frequency_spectrum, get_base64_from_array
from ..models.core import get_ensemble
from ..models.explainability import generate_spatial_mock_gradcam, generate_frequency_overlay

logger = logging.getLogger(__name__)

def run_prediction(image_bytes: bytes, return_explanation: bool = False) -> dict:
    """
    End-to-end pipeline: bytes -> prediction -> explanation maps
    """
    warnings = []
    
    # 1. Load Image
    img = load_image(image_bytes)
    
    # 2. Check for compression / size anomalies (simulated warning)
    if len(image_bytes) < 50_000: # < 50KB might be highly compressed
        warnings.append("Low image quality or highly compressed. Prediction may be degraded.")
        
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
        "frequency_map_png_base64": ""
    }
    
    if return_explanation:
        logger.info("Generating explanation heatmaps...")
        saliency_overlay = generate_spatial_mock_gradcam(face_img, result["scores"]["ensemble"])
        frequency_overlay = generate_frequency_overlay(img)
        
        explanations["saliency_png_base64"] = get_base64_from_array(saliency_overlay, colormap=None) # Colormap already applied
        explanations["frequency_map_png_base64"] = get_base64_from_array(frequency_overlay, colormap=None)
        
    result["explanation"] = explanations
    
    return result
