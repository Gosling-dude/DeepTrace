# DeepTrace

DeepTrace is a production-ready, modular system designed to detect whether a single image is AI-generated or genuine. It provides clear explainability (with saliency heatmaps and frequency analysis), an intuitive React frontend, a robust FastAPI backend serving model inference, reproducible training pipelines, and deployment scripts.

This repository currently implements **Phase 1 (MVP)**, which focuses on Image-only detection. Video detection and advanced robustness features are planned for future phases.

## Features (Phase 1 MVP)

*   **Single Image Check:** Upload an image and immediately see if it is AI-generated or genuine.
*   **Explainability:** Visual explanations including Grad-CAM spatial heatmaps and frequency spectrum artifacts.
*   **Confidence Score & Metadata:** Provides probabilities, inference time, and details on model version.
*   **Two-stream Hybrid Architecture:** (Spatial CNN + Frequency stream) working together to identify generation artifacts.
*   **Sample Gallery:** Quickly test the system with a curated set of known genuine and AI-generated images.

## Project Structure

```text
deeptrace/
├── README.md
├── LICENSE
├── data/
│   ├── raw/                     # Raw downloads (not committed)
│   └── processed/
├── datasets/                    # Dataset-specific scripts
│   └── scripts/
├── notebooks/                   # Exploratory and training notebooks
├── src/
│   ├── backend/
│   │   ├── app/                 # FastAPI app
│   │   ├── models/              # Model wrappers & explainability
│   │   ├── services/            # Preprocessing, postprocessing
│   │   ├── tests/
│   │   └── Dockerfile
│   └── frontend/
│       ├── app/                 # React app (Vite)
│       └── Dockerfile
├── infra/
│   ├── docker-compose.yml
│   └── deploy/                  # Deployment manifests
├── experiments/                 # Checkpoints & logs (gitignored)
├── scripts/
│   ├── train_image.sh
│   ├── evaluate.sh
│   └── download_datasets.py
└── .github/
    └── workflows/               # CI configuration
```

## Quick Start (Local Development)

### 1. Requirements
*   Docker & docker-compose installed.
*   Python 3.10+ (for local training/scripting)

### 2. Running the System
The easiest way to run the entire backend and frontend stack locally is using Docker Compose.

```bash
# From the project root, build and start the containers
docker-compose -f infra/docker-compose.yml up --build
```
*   **Frontend UI:** [http://localhost:3000](http://localhost:3000)
*   **Backend API Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)

### 3. API Example

```bash
curl -X POST "http://localhost:8000/api/v1/image/predict" \
  -H "accept: application/json" \
  -F "file=@/path/to/image.jpg" \
  -F "explain=true"
```

### 4. Downloading a Mock Dataset
To test reproducibility and try out local evaluation scripts, download a mock dataset of sample genuine and AI images.

```bash
python scripts/download_datasets.py
```

## Production Deployment

Deployment configurations can be found inside the `infra/deploy/` directory. For a standard PaaS environment (like AWS ECS or GCP Cloud Run), multi-stage Dockerfiles in `src/backend/Dockerfile` and `src/frontend/Dockerfile` have been provided to minimize container size.

## Model Training & Evaluation

All experiments and model weights should be kept in the `experiments/` director. The project provides bash scripts for executing deterministic training and model evaluation metrics (ROC-AUC, Calibration, etc.)

```bash
# Evaluate baseline
bash scripts/evaluate.sh

# Train model
bash scripts/train_image.sh
```

## Roadmap

*   **Phase 1 (MVP) -> You are here:** Image-only detection, local backend/inference, reproducible training.
*   **Phase 2:** Extend to video (frame-level and temporal consistency), batch processing, streaming inference.
*   **Phase 3:** Harden for adversarial robustness, scale to multi-tenant cloud deployment.

## Known Limitations
*   *False Negatives:* Highly realistic diffusion-based faces or aggressively compressed images might evade detection.
*   *Scope:* Currently optimized for human faces and standard photographic scenes. Non-photorealistic inputs or graphic art will yield unpredictable results and should be flagged as unsupported.
