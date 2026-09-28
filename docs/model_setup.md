# Model Setup & Architecture

DeepTrace relies on a highly specialized Hybrid Dual-Stream CNN architecture. This document explains how to configure, download, and modify the underlying ML models.

## 1. Architecture Overview

To circumvent advanced AI generation techniques (which often fool standard spatial CNNs), we utilize an ensemble of two distinct PyTorch models:

### Stream A: Spatial CNN (EfficientNet / ResNet)
- **Purpose**: Detects pixel-level artifacts, unnatural blending, asymmetric features, and generic noise signatures left by Diffusion models.
- **Input**: RGB Image Tensor (BCHW).
- **Output**: Binary probability score.

### Stream B: Frequency CNN (Custom Shallow Architecture)
- **Purpose**: Detects periodic grid artifacts and high-frequency structural anomalies. AI-generated images inherently possess different spatial frequencies than natural photographs due to upsampling convolutions.
- **Input**: Grayscale FFT/DCT Magnitude Spectrum Tensor (BCHW).
- **Output**: Binary probability score.

### Ensemble Logic
The predictions from both streams are fused using a weighted average. The `HybridEnsemblePredictor` handles the lazy loading of these models into memory and dynamically delegates tensors to the CPU or GPU.

### Video Deepfake Pipeline
Video analysis (`src/backend/models/video_core.py`, `src/backend/services/video_*.py`) reuses the image ensemble per frame and adds a temporal stream:

1. **Frame sampling** — `VIDEO_SAMPLE_FRAMES` (default 16) frames are sampled uniformly across the clip, so cost is independent of video length.
2. **Face localisation** — YuNet (`face_detection_yunet_2023mar.onnx`) if present in the weights directory, else OpenCV's Haar cascade (OpenCV 4.x only), else a centre crop.
3. **Frame stream** — each face crop is scored by the spatial + frequency ensemble; scores are aggregated as mean, top-25% mean and max, so a manipulation confined to part of a clip still counts.
4. **Temporal stream** — face flicker (face-region change relative to the whole frame), face box jitter and sharpness variance. Face swaps are generated frame by frame and tend to be temporally inconsistent.
5. **Fusion** — if `temporal_v1.pt` (a `TemporalFusionHead`) is present it maps these features to a fake probability; otherwise `0.75 × frame signal + 0.25 × temporal score`.

---

## 2. Managing Weights

Model weights (`.pt` files) are large and should **never** be committed to version control. They are ignored in `.gitignore`.

### Default Directory
The FastAPI backend expects to find the weights in `src/backend/models/weights/`.
- `spatial_v1.pt`
- `freq_v1.pt`
- `face_detection_yunet_2023mar.onnx` (optional, video face detection — fetched by the download script)
- `temporal_v1.pt` (optional, learned video fusion head)

### Downloading Weights
You can fetch the models using the provided setup script:

```bash
python scripts/download_weights.py
```

*Note: For local development and portfolio demonstration purposes, if an external blob-storage bucket is not configured, this script will automatically instantiate the PyTorch classes and save "dummy" state dictionaries locally. This prevents the FastAPI application from crashing and allows you to test the API and UI flawlessly without requiring massive pre-trained weights.*

### Fallback Mode
If weight files are completely missing and the backend starts up, it will gracefully fall back to `mock` mode (returning simulated probabilities based on a Beta distribution) if `FALLBACK_TO_MOCK_MODEL=True` is set in `.env`.

---

## 3. Future Integration (HuggingFace / S3)

To integrate actual production weights in the future, update `scripts/download_weights.py` to leverage the HuggingFace Hub:

```python
from huggingface_hub import hf_hub_download

def download_hf_weights(target_dir):
    spatial_path = hf_hub_download(repo_id="your-org/deeptrace-spatial", filename="spatial_v1.pt")
    # Move to target_dir...
```

For AWS S3:
```python
import boto3

s3 = boto3.client('s3')
s3.download_file('deeptrace-weights', 'spatial_v1.pt', str(target_dir / 'spatial_v1.pt'))
```

---

## 4. Explainability (Grad-CAM)
The spatial model's last convolutional layer is hooked to generate Grad-CAM (Gradient-weighted Class Activation Mapping) visualizations. These heatmaps are generated dynamically post-inference, overlaid on the original image, and returned to the frontend as Base64 strings.
