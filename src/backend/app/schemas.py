"""
Pydantic schemas for API request/response validation.
"""

from typing import Optional, Dict, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field, EmailStr


# ─── Auth Schemas ────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=255, description="User email")
    password: str = Field(..., min_length=8, max_length=128, description="Password (min 8 chars)")
    full_name: str = Field(..., min_length=1, max_length=255, description="Full name")


class LoginRequest(BaseModel):
    email: str = Field(..., description="User email")
    password: str = Field(..., description="Password")


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int = Field(description="Access token TTL in seconds")


class RefreshRequest(BaseModel):
    refresh_token: str


class PasswordResetRequest(BaseModel):
    email: str


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8, max_length=128)


class UpdateProfileRequest(BaseModel):
    full_name: Optional[str] = Field(None, min_length=1, max_length=255)
    email: Optional[str] = Field(None, min_length=5, max_length=255)


# ─── User Schemas ────────────────────────────────────────

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    is_active: bool
    email_verified: bool
    created_at: datetime
    last_login: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class UserListResponse(BaseModel):
    users: List[UserResponse]
    total: int
    page: int
    per_page: int


# ─── Inference Schemas ───────────────────────────────────

class ExplanationOutputs(BaseModel):
    saliency_png_base64: str = Field(description="Base64 encoded Grad-CAM overlay")
    frequency_map_png_base64: str = Field(description="Base64 encoded frequency spectrum visualization")


class InferenceResult(BaseModel):
    id: str = Field(description="Unique prediction ID")
    is_ai_generated: bool = Field(description="Final verdict on the image authenticity")
    confidence: float = Field(ge=0.0, le=1.0, description="Predicted probability (0.0 to 1.0) of being AI generated")
    model_version: str = Field(description="Version tag of the model used")
    scores: Dict[str, float] = Field(description="Raw head scores (e.g. cnn, freq, ensemble)")
    explanation: ExplanationOutputs = Field(description="Visual explanatory data")
    warnings: List[str] = Field(default_factory=list, description="List of warnings")
    inference_ms: int = Field(description="Total server-side processing time in ms")
    upload_id: Optional[str] = Field(None, description="Associated upload record ID")
    original_filename: Optional[str] = Field(None, description="Original uploaded filename")
    created_at: Optional[datetime] = None

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "is_ai_generated": True,
                "confidence": 0.92,
                "model_version": "v1.0.0",
                "scores": {"cnn": 0.87, "freq": 0.93, "ensemble": 0.92},
                "explanation": {
                    "saliency_png_base64": "data:image/png;base64,...",
                    "frequency_map_png_base64": "data:image/png;base64,...",
                },
                "warnings": ["image_compressed"],
                "inference_ms": 125,
            }
        },
    )


class PredictionHistoryItem(BaseModel):
    id: str
    upload_id: str
    is_ai_generated: bool
    confidence: float
    model_version: str
    inference_ms: int
    warnings: List[str]
    original_filename: str
    file_size_bytes: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PredictionHistoryResponse(BaseModel):
    predictions: List[PredictionHistoryItem]
    total: int
    page: int
    per_page: int


# ─── Model Status ────────────────────────────────────────

class ModelStatusResponse(BaseModel):
    model_name: str
    version: str
    loaded_timestamp: str
    device: str
    is_ready: bool


# ─── Admin Schemas ───────────────────────────────────────

class PlatformStats(BaseModel):
    total_users: int
    active_users_today: int
    active_users_week: int
    active_users_month: int
    total_uploads: int
    total_predictions: int
    ai_detected_count: int
    real_detected_count: int
    avg_confidence: float
    avg_inference_ms: float
    error_rate: float


class TimeSeriesPoint(BaseModel):
    date: str
    count: int


class AnalyticsTrends(BaseModel):
    daily_predictions: List[TimeSeriesPoint]
    daily_signups: List[TimeSeriesPoint]
    confidence_distribution: List[Dict[str, float]]
    ai_vs_real_trend: List[Dict]


class AuditLogEntry(BaseModel):
    id: str
    actor_id: Optional[str]
    action: str
    resource_type: Optional[str]
    resource_id: Optional[str]
    details: dict
    ip_address: Optional[str]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AuditLogResponse(BaseModel):
    logs: List[AuditLogEntry]
    total: int
    page: int
    per_page: int


class RoleUpdateRequest(BaseModel):
    role: str = Field(..., pattern="^(user|admin)$")


class StatusUpdateRequest(BaseModel):
    is_active: bool


# ─── Generic ─────────────────────────────────────────────

class MessageResponse(BaseModel):
    message: str
    detail: Optional[str] = None
