import time
import uuid
import logging
from datetime import datetime
from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .schemas import InferenceResult, ModelStatusResponse

# Setup simple structured logger for the MVP
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("DeepTraceBackend")

app = FastAPI(
    title="DeepTrace API",
    description="Backend API for AI Image Detection MVP",
    version="0.3.0"
)

# CORS config
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In prod, restrict to frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global startup state for models (mock loaded timestamp)
STARTUP_TIME = datetime.utcnow().isoformat()

# Placeholders for actual inference logic, we'll implement these next
def perform_inference(image_bytes: bytes, explain: bool):
    # This will be replaced by the actual model ensemble logic
    from ..services.inference import run_prediction
    return run_prediction(image_bytes, explain)

@app.get("/api/v1/health")
async def health_check():
    """Readiness and liveness probe."""
    return {"status": "ok", "service": "DeepTrace Model Backend"}

@app.get("/api/v1/model/status", response_model=ModelStatusResponse)
async def get_model_status():
    """Returns details about the actively loaded model and device context."""
    # In full implementation, determine PyTorch/CUDA device dynamically
    return ModelStatusResponse(
        model_name="deep_trace_hybrid_ensemble",
        version="v0.3.0",
        loaded_timestamp=STARTUP_TIME,
        device="cpu", # hardcoded for MVP docker
        is_ready=True
    )

@app.post("/api/v1/image/predict", response_model=InferenceResult)
async def predict_image(file: UploadFile = File(...), explain: bool = Form(False)):
    """
    Main single-image detection endpoint.
    Expects multipart/form-data.
    """
    start_time = time.time()
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload an image.")
    
    try:
        contents = await file.read()
        
        # Run inference
        result_dict = perform_inference(contents, explain)
        
        end_time = time.time()
        inference_ms = int((end_time - start_time) * 1000)
        
        # Construct and validate response schema
        inference_result = InferenceResult(
            id=str(uuid.uuid4()),
            is_ai_generated=result_dict["is_ai_generated"],
            confidence=result_dict["confidence"],
            model_version="v0.3.0",
            scores=result_dict["scores"],
            explanation=result_dict["explanation"],
            warnings=result_dict.get("warnings", []),
            inference_ms=inference_ms
        )
        return inference_result

    except Exception as e:
        logger.error(f"Prediction failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
