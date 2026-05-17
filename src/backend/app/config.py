"""
Application configuration loaded from environment variables.
Uses pydantic-settings for type-safe, validated config.
"""

import os
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # ── App ──────────────────────────────────────────────
    APP_NAME: str = "DeepTrace"
    APP_ENV: str = "development"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    # ── Database ─────────────────────────────────────────
    DATABASE_URL: str = "sqlite:///./deeptrace.db"

    # ── JWT Auth ─────────────────────────────────────────
    JWT_SECRET_KEY: str = "CHANGE-ME-in-production-use-openssl-rand-hex-32"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ── CORS ─────────────────────────────────────────────
    FRONTEND_URL: str = "http://localhost:3000"
    BACKEND_URL: str = "http://localhost:8000"

    # ── File Storage ─────────────────────────────────────
    UPLOAD_DIR: str = "./uploads"
    MAX_FILE_SIZE_MB: int = 10
    ALLOWED_EXTENSIONS: str = "jpg,jpeg,png,webp,bmp,tiff"

    # ── Rate Limiting ────────────────────────────────────
    RATE_LIMIT_PER_MINUTE: int = 30

    # ── Admin Seed ───────────────────────────────────────
    ADMIN_EMAIL: str = "admin@deeptrace.ai"
    ADMIN_PASSWORD: str = "changeme123"
    ADMIN_NAME: str = "DeepTrace Admin"

    # ── ML Models ────────────────────────────────────────
    MODEL_WEIGHTS_DIR: str = "./models/weights"
    FALLBACK_TO_MOCK_MODEL: bool = True
    DEVICE: str = "cpu"  # or 'cuda'

    @property
    def allowed_extensions_list(self) -> list[str]:
        return [ext.strip().lower() for ext in self.ALLOWED_EXTENSIONS.split(",")]

    @property
    def max_file_size_bytes(self) -> int:
        return self.MAX_FILE_SIZE_MB * 1024 * 1024

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": True,
    }


@lru_cache()
def get_settings() -> Settings:
    return Settings()
