"""
Health check and model status routes (public).
"""

from datetime import datetime, timezone
from fastapi import APIRouter

from ..schemas import ModelStatusResponse
from ...models.core import get_ensemble

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
