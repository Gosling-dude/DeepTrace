import io
import numpy as np
from PIL import Image
from src.backend.services.inference import run_prediction

def test_prediction_pipeline():
    # Create a dummy image
    img = Image.fromarray(np.random.randint(0, 255, (224,224,3), dtype=np.uint8))
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format='JPEG')
    img_bytes = img_byte_arr.getvalue()
    
    # Run prediction without explainability
    res = run_prediction(img_bytes, return_explanation=False)
    
    assert "is_ai_generated" in res
    assert "confidence" in res
    assert "scores" in res
    assert "explanation" in res
    
    # Assert explanation images are empty because return_explanation is False
    assert res["explanation"]["saliency_png_base64"] == ""
    assert res["explanation"]["frequency_map_png_base64"] == ""
    
def test_prediction_with_explanation():
    img = Image.fromarray(np.random.randint(0, 255, (224,224,3), dtype=np.uint8))
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format='JPEG')
    img_bytes = img_byte_arr.getvalue()
    
    # Run prediction
    res = run_prediction(img_bytes, return_explanation=True)
    
    # Explanation strings should be populated with base64 data
    assert res["explanation"]["saliency_png_base64"].startswith("data:image/png;base64,")
    assert res["explanation"]["frequency_map_png_base64"].startswith("data:image/png;base64,")
