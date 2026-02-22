# DeepTrace Backend Core

## Overview
The DeepTrace backend MVP is a monolithic Python/FastAPI service responsible for receiving an image, preprocessing it, inferring a classification using a mock deep-learning ensemble, and returning both the prediction and base64-encoded explainability heatmaps (Grad-CAM and Frequency maps).

## Request Pipeline

1. **API Endpoint (`/api/v1/image/predict`)**:
   - Accepts `multipart/form-data` containing the image file.
   - Forwards bytes to the inference orchestrator.

2. **Inference Service (`services/inference.py`)**:
   - **Pre-processing**: Uses PIL and OpenCV to extract crops (mock face detection) and resize the image for spatial analysis. It also computes a 2D-FFT logarithmic magnitude spectrum for frequency analysis.
   - **Model Prediction**: Sends tensors to the `HybridEnsemblePredictor`.
   - **Explainability**: If requested, triggers `models/explainability.py` to overlay heatmap artifacts over the original image, converting the matrix into base64 PNG data URLs.

3. **Hybrid Ensemble Predictor (`models/core.py`)**:
   - A mock implementation of a dual-stream architecture (Spatial CNN + Frequency Network).
   - Averages the pseudo-random prediction scores derived from Beta distributions (simulating trained network confidence maps) into a final ensemble score.

## Testing Setup
Run backend tests locally using `pytest`:
```bash
cd src/backend
PYTHONPATH=.. pytest tests/
```
