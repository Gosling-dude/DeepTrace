"""
DeepTrace API — Main Application Entry Point.

Production-ready FastAPI application with:
- JWT authentication
- Role-based access control
- Rate limiting
- Security headers
- Structured logging
- Database initialization
- Admin seed on first run
"""

import logging
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .database import init_db, SessionLocal
from .middleware import (
    SecurityHeadersMiddleware,
    RequestLoggingMiddleware,
    setup_rate_limiter,
)
from .routers import auth, image, admin, health

# ─── Logging Setup ───────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s │ %(name)-28s │ %(levelname)-7s │ %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("DeepTrace")

settings = get_settings()


# ─── Lifespan (startup/shutdown) ─────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown logic."""
    logger.info(f"🚀 Starting {settings.APP_NAME} v{settings.APP_VERSION} ({settings.APP_ENV})")

    # Initialize database tables
    init_db()
    logger.info("✅ Database initialized")

    # Ensure upload directory exists
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

    # Seed admin user on first run
    _seed_admin_user()

    yield

    logger.info(f"🛑 Shutting down {settings.APP_NAME}")


def _seed_admin_user():
    """Create the default admin user if it doesn't exist."""
    from ..services.auth_service import register_user
    from ..models.db_models import User

    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == settings.ADMIN_EMAIL.lower()).first()
        if not existing:
            register_user(
                db,
                email=settings.ADMIN_EMAIL,
                password=settings.ADMIN_PASSWORD,
                full_name=settings.ADMIN_NAME,
                role="admin",
            )
            logger.info(f"✅ Admin user seeded: {settings.ADMIN_EMAIL}")
        else:
            logger.info(f"ℹ️  Admin user already exists: {settings.ADMIN_EMAIL}")
    except Exception as e:
        logger.error(f"Failed to seed admin: {e}")
    finally:
        db.close()


# ─── App Factory ─────────────────────────────────────────

app = FastAPI(
    title="DeepTrace API",
    description="AI-Generated Image Detection Platform with Explainability",
    version=settings.APP_VERSION,
    lifespan=lifespan,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
)

# ─── CORS ────────────────────────────────────────────────
cors_origins = [settings.FRONTEND_URL]
if settings.APP_ENV == "development":
    cors_origins.append("http://localhost:3000")
    cors_origins.append("http://localhost:5173")
    cors_origins.append("http://127.0.0.1:3000")
    cors_origins.append("http://127.0.0.1:5173")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# ─── Custom Middleware ───────────────────────────────────
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RequestLoggingMiddleware)
setup_rate_limiter(app)

# ─── Register Routers ───────────────────────────────────
app.include_router(health.router)
app.include_router(auth.router)
app.include_router(image.router)
app.include_router(admin.router)
