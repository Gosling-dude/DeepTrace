"""
Video deepfake detector.

Two complementary signals are fused into one verdict:

1. Frame stream — every sampled face crop goes through the existing hybrid
   spatial + frequency ensemble, giving a per-frame manipulation score.
2. Temporal stream — inter-frame inconsistency features (face flicker,
   bounding-box jitter, sharpness variance) that per-frame generators leave
   behind even when individual frames look clean.

If `temporal_v1.pt` is present in MODEL_WEIGHTS_DIR, a small learned fusion
head combines the signals; otherwise a fixed weighted fusion is used.
"""

import logging
import math
from pathlib import Path

import numpy as np

from .core import get_ensemble, TORCH_AVAILABLE, nn
from ..app.config import get_settings
from ..services.preprocess import preprocess_for_spatial, compute_frequency_spectrum

if TORCH_AVAILABLE:
    import torch

logger = logging.getLogger("DeepTrace.models.video")
settings = get_settings()

VIDEO_MODEL_VERSION = "video-v1.0.0"

# Fixed fusion weights used when no learned head is available.
FRAME_WEIGHT = 0.75
TEMPORAL_WEIGHT = 0.25

# Feature order consumed by the learned fusion head.
FUSION_FEATURES = [
    "frame_mean", "frame_max", "frame_topk", "frame_std",
    "face_flicker", "box_jitter", "sharpness_variance", "face_coverage",
]


class TemporalFusionHead(nn.Module):
    """Tiny MLP mapping aggregated frame + temporal features to a fake probability."""

    def __init__(self, in_features: int = len(FUSION_FEATURES)):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(in_features, 16),
            nn.ReLU(),
            nn.Linear(16, 1),
            nn.Sigmoid(),
        )

    def forward(self, x):
        return self.net(x)


def aggregate_frame_scores(scores: list[float]) -> dict:
    """Summarise per-frame scores. Top-k mean catches manipulations confined to part of a clip."""
    arr = np.asarray(scores, dtype=np.float32)
    k = max(1, math.ceil(len(arr) / 4))
    topk = float(np.sort(arr)[-k:].mean())
    return {
        "frame_mean": float(arr.mean()),
        "frame_max": float(arr.max()),
        "frame_topk": topk,
        "frame_std": float(arr.std()),
    }


class VideoDeepfakeDetector:
    def __init__(self):
        self.fusion_head = None
        self._fusion_checked = False

    def _load_fusion_head(self):
        if self._fusion_checked:
            return
        self._fusion_checked = True
        if not TORCH_AVAILABLE:
            return
        path = Path(settings.MODEL_WEIGHTS_DIR) / "temporal_v1.pt"
        if not path.exists():
            logger.info("temporal_v1.pt not found; using fixed frame/temporal fusion weights.")
            return
        try:
            head = TemporalFusionHead()
            head.load_state_dict(torch.load(path, map_location="cpu"))
            head.eval()
            self.fusion_head = head
            logger.info("Loaded learned temporal fusion head.")
        except Exception as e:
            logger.error(f"Failed to load temporal fusion head, using fixed weights: {e}")

    def score_frame(self, face_img, full_img) -> dict:
        """Run the image ensemble on a single sampled frame."""
        spatial = preprocess_for_spatial(face_img)
        freq = compute_frequency_spectrum(full_img)
        return get_ensemble().predict_ensemble(spatial, freq)

    def fuse(self, frame_agg: dict, temporal: dict) -> float:
        self._load_fusion_head()
        if self.fusion_head is not None:
            feats = {**frame_agg, **temporal}
            x = torch.tensor([[feats[name] for name in FUSION_FEATURES]], dtype=torch.float32)
            with torch.no_grad():
                return float(self.fusion_head(x).item())

        frame_signal = 0.5 * frame_agg["frame_mean"] + 0.5 * frame_agg["frame_topk"]
        return float(FRAME_WEIGHT * frame_signal + TEMPORAL_WEIGHT * temporal["score"])

    def get_status(self) -> dict:
        self._load_fusion_head()
        base = get_ensemble().get_status()
        return {
            "model_name": "Frame Ensemble + Temporal Consistency",
            "version": VIDEO_MODEL_VERSION,
            "device": base["device"],
            "is_ready": True,
            "mode": base["mode"],
            "fusion": "learned" if self.fusion_head is not None else "fixed",
        }


_video_detector = None


def get_video_detector() -> VideoDeepfakeDetector:
    global _video_detector
    if _video_detector is None:
        _video_detector = VideoDeepfakeDetector()
    return _video_detector
