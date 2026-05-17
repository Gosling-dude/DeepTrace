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

---

## 2. Managing Weights

Model weights (`.pt` files) are large and should **never** be committed to version control. They are ignored in `.gitignore`.

### Default Directory
The FastAPI backend expects to find the weights in `src/backend/models/weights/`.
- `spatial_v1.pt`
- `freq_v1.pt`

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
