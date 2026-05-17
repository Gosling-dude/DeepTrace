import os
import time
import logging
import numpy as np
from pathlib import Path

logger = logging.getLogger("DeepTrace.models.core")

# Try to import PyTorch, fallback gracefully if not installed or broken
try:
    import torch
    import torch.nn as nn
    from torchvision import models
    TORCH_AVAILABLE = True
except ImportError as e:
    logger.warning(f"PyTorch is not available or broken: {e}. Inference will run in Mock Mode.")
    TORCH_AVAILABLE = False
    
    # Create dummy classes for typing purposes if torch is missing
    class nn:
        class Module: pass

from ..app.config import get_settings
settings = get_settings()

class SpatialCNN(nn.Module):
    """
    Real PyTorch Spatial Stream using a lightweight EfficientNet-b0 or ResNet.
    Pre-trained on ImageNet, fine-tuned on real/AI faces.
    """
    def __init__(self):
        super().__init__()
        # Use a lightweight backbone suitable for CPU/FastAPI
        # We use resnet18 here as a lightweight stand-in.
        self.backbone = models.resnet18(weights=None)
        # Modify the final layer for binary classification (Real vs AI)
        num_ftrs = self.backbone.fc.in_features
        self.backbone.fc = nn.Sequential(
            nn.Linear(num_ftrs, 1),
            nn.Sigmoid()
        )

    def forward(self, x):
        return self.backbone(x)


class FrequencyCNN(nn.Module):
    """
    Real PyTorch Frequency Stream analyzing FFT/DCT magnitude spectrum.
    Detects periodic grid artifacts common in GANs and Diffusion models.
    """
    def __init__(self):
        super().__init__()
        self.features = nn.Sequential(
            nn.Conv2d(1, 32, kernel_size=3, stride=2, padding=1),
            nn.ReLU(),
            nn.Conv2d(32, 64, kernel_size=3, stride=2, padding=1),
            nn.ReLU(),
            nn.AdaptiveAvgPool2d((1, 1))
        )
        self.classifier = nn.Sequential(
            nn.Linear(64, 1),
            nn.Sigmoid()
        )

    def forward(self, x):
        x = self.features(x)
        x = torch.flatten(x, 1)
        return self.classifier(x)


class HybridEnsemblePredictor:
    """
    Manages lazy loading of PyTorch models, inference logic, and mock fallbacks.
    """
    def __init__(self):
        self.spatial_model = None
        self.freq_model = None
        self.is_loaded = False
        self.use_mock = not TORCH_AVAILABLE
        
        # Decide device
        if TORCH_AVAILABLE:
            self.device = torch.device(
                "cuda" if torch.cuda.is_available() and settings.DEVICE == "cuda" else "cpu"
            )
        else:
            self.device = "mock_device"
        
        logger.info(f"HybridEnsemblePredictor initialized. Target device: {self.device}")

    def load_models(self):
        """Lazy loads PyTorch weights from disk. Falls back to mock if missing."""
        if self.is_loaded:
            return
            
        if self.use_mock:
            logger.info("Running in mock mode due to missing PyTorch. Models bypassed.")
            self.is_loaded = True
            return

        spatial_path = Path(settings.MODEL_WEIGHTS_DIR) / "spatial_v1.pt"
        freq_path = Path(settings.MODEL_WEIGHTS_DIR) / "freq_v1.pt"

        try:
            # Check if weights exist
            if not spatial_path.exists() or not freq_path.exists():
                raise FileNotFoundError("Model weight files not found.")

            logger.info("Loading PyTorch models from disk...")
            
            # Load Spatial Model
            self.spatial_model = SpatialCNN().to(self.device)
            self.spatial_model.load_state_dict(torch.load(spatial_path, map_location=self.device))
            self.spatial_model.eval()

            # Load Frequency Model
            self.freq_model = FrequencyCNN().to(self.device)
            self.freq_model.load_state_dict(torch.load(freq_path, map_location=self.device))
            self.freq_model.eval()

            self.is_loaded = True
            logger.info("Models loaded successfully.")

        except Exception as e:
            logger.error(f"Failed to load real models: {e}")
            if settings.FALLBACK_TO_MOCK_MODEL:
                logger.warning("Falling back to mock inference pipeline.")
                self.use_mock = True
                self.is_loaded = True
            else:
                raise RuntimeError("Models failed to load and mock fallback is disabled.") from e

    def predict_ensemble(self, face_tensor: np.ndarray, freq_tensor: np.ndarray) -> dict:
        """
        Runs inference through both streams and ensembles the result.
        Returns a dictionary with scores and confidence.
        """
        # Ensure models are loaded (Lazy initialization)
        if not self.is_loaded:
            self.load_models()

        if self.use_mock:
            return self._mock_predict()

        try:
            # Prepare tensors for PyTorch (assuming inputs are HWC numpy arrays, convert to BCHW)
            # Spatial: RGB (3 channels)
            s_tensor = torch.from_numpy(face_tensor).float()
            if s_tensor.ndim == 3:
                s_tensor = s_tensor.permute(2, 0, 1).unsqueeze(0) # HWC -> BCHW
            s_tensor = s_tensor.to(self.device)

            # Frequency: Grayscale (1 channel)
            f_tensor = torch.from_numpy(freq_tensor).float()
            if f_tensor.ndim == 2:
                f_tensor = f_tensor.unsqueeze(0).unsqueeze(0) # HW -> BCHW
            elif f_tensor.ndim == 3:
                f_tensor = f_tensor.permute(2, 0, 1).unsqueeze(0)
            f_tensor = f_tensor.to(self.device)

            with torch.no_grad():
                s_score = self.spatial_model(s_tensor).item()
                f_score = self.freq_model(f_tensor).item()

            # Ensemble via weighted average
            ensemble_score = (s_score * 0.6) + (f_score * 0.4)
            is_ai = ensemble_score > 0.5

            return {
                "is_ai_generated": bool(is_ai),
                "confidence": float(max(ensemble_score, 1 - ensemble_score)),
                "scores": {
                    "cnn": float(s_score),
                    "freq": float(f_score),
                    "ensemble": float(ensemble_score)
                }
            }
        except Exception as e:
            logger.error(f"Inference error: {e}")
            raise RuntimeError(f"Failed during model inference: {e}")

    def _mock_predict(self) -> dict:
        """Simulates the inference pipeline for development when weights are missing."""
        time.sleep(0.3) # Simulate spatial latency
        s_score = float(np.random.beta(5, 5))
        
        time.sleep(0.1) # Simulate frequency latency
        f_score = float(np.random.beta(5, 5))

        ensemble_score = (s_score * 0.6) + (f_score * 0.4)
        is_ai = ensemble_score > 0.5

        return {
            "is_ai_generated": bool(is_ai),
            "confidence": float(max(ensemble_score, 1 - ensemble_score)),
            "scores": {
                "cnn": s_score,
                "freq": f_score,
                "ensemble": ensemble_score
            }
        }

    def get_status(self) -> dict:
        """Returns the readiness status and metadata of the models."""
        return {
            "model_name": "Hybrid Dual-Stream CNN",
            "version": "v1.0.0",
            "device": str(self.device),
            "is_ready": self.is_loaded,
            "mode": "mock" if self.use_mock else "production"
        }

# Global singleton instance
_ensemble_predictor = None

def get_ensemble() -> HybridEnsemblePredictor:
    """Singleton getter for the predictor."""
    global _ensemble_predictor
    if _ensemble_predictor is None:
        _ensemble_predictor = HybridEnsemblePredictor()
    return _ensemble_predictor
