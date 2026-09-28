"""
Health check and model status routes (public).
"""

from datetime import datetime, timezone
from fastapi import APIRouter

from ..schemas import ModelStatusResponse
from ...models.core import get_ensemble
from ...models.video_core import get_video_detector

router = APIRouter(tags=["System"])

STARTUP_TIME = datetime.now(timezone.utc).isoformat()


@router.get("/api/v1/health")
async def health_check():
    """Readiness and liveness probe."""
    return {"status": "ok", "service": "DeepTrace API", "version": "1.0.0"}


@router.get("/api/v1/model/status", response_model=ModelStatusResponse)
async def get_model_status():
    """Returns details about the actively loaded model and device context."""
    ensemble = get_ensemble()
    status_info = ensemble.get_status()

    return ModelStatusResponse(
        model_name=status_info["model_name"] + f" ({status_info['mode']})",
        version=status_info["version"],
        loaded_timestamp=STARTUP_TIME,
        device=status_info["device"],
        is_ready=status_info["is_ready"],
    )


@router.get("/api/v1/model/video/status", response_model=ModelStatusResponse)
async def get_video_model_status():
    """Returns details about the video deepfake detector."""
    status_info = get_video_detector().get_status()

    return ModelStatusResponse(
        model_name=status_info["model_name"] + f" ({status_info['mode']}, {status_info['fusion']} fusion)",
        version=status_info["version"],
        loaded_timestamp=STARTUP_TIME,
        device=status_info["device"],
        is_ready=status_info["is_ready"],
    )
