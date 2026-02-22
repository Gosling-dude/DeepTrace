from typing import Dict, List
from pydantic import BaseModel, ConfigDict, Field

class ExplanationOutputs(BaseModel):
    saliency_png_base64: str = Field(description="Base64 encoded Grad-CAM overlay")
    frequency_map_png_base64: str = Field(description="Base64 encoded frequency spectrum visualization")

class InferenceResult(BaseModel):
    id: str = Field(description="Unique request ID mapping to this prediction")
    is_ai_generated: bool = Field(description="Final verdict on the image authenticity")
    confidence: float = Field(ge=0.0, le=1.0, description="Predicted probability (0.0 to 1.0) of being AI generated")
    model_version: str = Field(description="Version tag of the model used")
    scores: Dict[str, float] = Field(description="Raw head scores (e.g. cnn, freq, ensemble)")
    explanation: ExplanationOutputs = Field(description="Visual explanatory data")
    warnings: List[str] = Field(default_factory=list, description="List of warnings (e.g. compression detected, no face found)")
    inference_ms: int = Field(description="Total server-side processing time in ms")
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "is_ai_generated": True,
                "confidence": 0.92,
                "model_version": "v0.3.0",
                "scores": {"cnn": 0.87, "freq": 0.93, "ensemble": 0.92},
                "explanation": {
                    "saliency_png_base64": "data:image/png;base64,...",
                    "frequency_map_png_base64": "data:image/png;base64,..."
                },
                "warnings": ["image_compressed"],
                "inference_ms": 125
            }
        }
    )

class ModelStatusResponse(BaseModel):
    model_name: str
    version: str
    loaded_timestamp: str
    device: str
    is_ready: bool
