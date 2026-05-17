"""
Centralized test configuration for DeepTrace backend.

Sets up an isolated in-memory SQLite database and overrides the FastAPI
dependency injector so every test runs against a fresh, ephemeral schema.
"""

import os

# Force test environment BEFORE any app module touches pydantic-settings.
os.environ["APP_ENV"] = "test"
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["FALLBACK_TO_MOCK_MODEL"] = "True"
os.environ["JWT_SECRET_KEY"] = "test-secret-key-not-for-production"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Clear the settings cache so pydantic-settings picks up the env overrides.
from src.backend.app.config import get_settings
get_settings.cache_clear()

from src.backend.app.main import app
from src.backend.app.database import get_db, Base

# Setup completely isolated in-memory DB for tests.
# StaticPool ensures all connections share the same in-memory database.
engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(autouse=True)
def setup_db():
    """Create fresh tables before every test and drop them after."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db_session():
    """Provides a direct database session for test setup/assertions."""
    session = TestingSessionLocal()
    yield session
    session.close()


@pytest.fixture
def client():
    """Provides a TestClient with lifespan events triggered."""
    with TestClient(app) as c:
        yield c
