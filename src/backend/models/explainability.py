import cv2
import numpy as np
from PIL import Image

def generate_spatial_mock_gradcam(image: Image.Image, score: float) -> np.ndarray:
    """
    Mock Grad-CAM generation for the MVP.
    In real usage, hooks into the PyTorch CNN gradients (e.g., using pytorch-grad-cam library).
    """
    width, height = image.size
    
    # Generate a random heatmap to look like a true grad-cam output
    heatmap = np.zeros((height, width), dtype=np.float32)
    
    if score > 0.5:
        # If AI generated, highlight eyes or edges (mocking typical GAN artifacts)
        cx, cy = width // 2, height // 2
        cv2.circle(heatmap, (cx, cy), radius=int(width*0.3), color=1.0, thickness=-1)
        heatmap = cv2.GaussianBlur(heatmap, (51, 51), 0)
    else:
        # Diffuse generic attention for real images
        heatmap = np.random.rand(height // 10, width // 10).astype(np.float32)
        heatmap = cv2.resize(heatmap, (width, height))
        heatmap = cv2.GaussianBlur(heatmap, (21, 21), 0)
        
    heatmap = np.clip(heatmap, 0, 1)
    
    # Overlay heatmap onto original image
    img_np = np.array(image.convert('RGB'))[:, :, ::-1] # RGB to BGR for cv2
    
    heatmap_colored = cv2.applyColorMap(np.uint8(255 * heatmap), cv2.COLORMAP_JET)
    overlay = cv2.addWeighted(img_np, 0.6, heatmap_colored, 0.4, 0)
    
    # Return as RGB
    return overlay[:, :, ::-1]

def generate_frequency_overlay(image: Image.Image) -> np.ndarray:
    """
    Returns visual representation of frequency domain artifacts.
    Reuses logic from preprocess.py, but formats as an RGB image ready for UI.
    """
    from ..services.preprocess import compute_frequency_spectrum
    
    freq_map_uint8 = compute_frequency_spectrum(image)
    
    # Apply colormap to make it visually distinct (e.g. VIRIDIS implies spectrogram)
    freq_colored = cv2.applyColorMap(freq_map_uint8, cv2.COLORMAP_VIRIDIS)
    return freq_colored[:, :, ::-1] # Return RGB
