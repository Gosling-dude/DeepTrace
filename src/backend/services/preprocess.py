import cv2
import numpy as np
import base64
from io import BytesIO
from PIL import Image

def load_image(file_bytes: bytes) -> Image.Image:
    """Load image from bytes and convert to RGB."""
    img = Image.open(BytesIO(file_bytes))
    if img.mode != 'RGB':
        img = img.convert('RGB')
    return img

def detect_face(image: Image.Image) -> Image.Image:
    """
    Mock face detection logic. In phase 2, use MTCNN or RetinaFace.
    For now, return a naive center crop to simulate finding a face.
    """
    width, height = image.size
    new_size = min(width, height)
    left = (width - new_size) // 2
    top = (height - new_size) // 2
    right = (width + new_size) // 2
    bottom = (height + new_size) // 2
    
    return image.crop((left, top, right, bottom))

def preprocess_for_spatial(image: Image.Image, size=(224, 224)) -> np.ndarray:
    """
    Preprocess image for CNN (resize, normalize).
    Returns a numpy array [1, C, H, W] for PyTorch.
    """
    img_resized = image.resize(size)
    img_np = np.array(img_resized).astype(np.float32) / 255.0
    
    # Simple ImageNet mean/std normalization logic would go here
    # mean = np.array([0.485, 0.456, 0.406])
    # std = np.array([0.229, 0.224, 0.225])
    # img_np = (img_np - mean) / std
    
    # Convert to CHW format and add batch dimension
    img_tensor = np.expand_dims(np.transpose(img_np, (2, 0, 1)), axis=0)
    return img_tensor

def compute_frequency_spectrum(image: Image.Image) -> np.ndarray:
    """
    Compute 2D FFT magnitude spectrum (log scaled) of the image grayscale.
    Useful for detecting GAN/Diffusion grid artifacts.
    """
    img_gray = np.array(image.convert('L'))
    f_transform = np.fft.fft2(img_gray)
    f_shift = np.fft.fftshift(f_transform)
    
    # Calculate magnitude spectrum (log scaled)
    magnitude_spectrum = 20 * np.log(np.abs(f_shift) + 1e-8)
    
    # Normalize to 0-255 for visualization
    mag_normalized = cv2.normalize(magnitude_spectrum, None, 0, 255, cv2.NORM_MINMAX)
    mag_uint8 = np.uint8(mag_normalized)
    
    return mag_uint8

def get_base64_from_array(arr: np.ndarray, colormap=cv2.COLORMAP_JET) -> str:
    """Apply a colormap to a grayscale array and encode to base64 PNG."""
    if len(arr.shape) == 2:
        heatmap = cv2.applyColorMap(arr, colormap)
    else:
        heatmap = arr
        
    _, buffer = cv2.imencode('.png', heatmap)
    base64_str = base64.b64encode(buffer).decode('utf-8')
    return f"data:image/png;base64,{base64_str}"
