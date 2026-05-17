"""
SQLAlchemy ORM models for all database tables.
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Boolean, Float, Integer, DateTime,
    ForeignKey, Text, JSON, Index,
)
from sqlalchemy.orm import relationship
from ..app.database import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False, default="user")  # "user" | "admin"
    is_active = Column(Boolean, default=True, nullable=False)
    email_verified = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)
    last_login = Column(DateTime, nullable=True)

    # Relationships
    uploads = relationship("Upload", back_populates="user", cascade="all, delete-orphan")
    predictions = relationship("Prediction", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User {self.email} ({self.role})>"


class Upload(Base):
    __tablename__ = "uploads"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    original_filename = Column(String(512), nullable=False)
    stored_path = Column(String(1024), nullable=False)
    content_type = Column(String(100), nullable=False)
    file_size_bytes = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)

    # Relationships
    user = relationship("User", back_populates="uploads")
    prediction = relationship("Prediction", back_populates="upload", uselist=False, cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Upload {self.original_filename}>"


class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    upload_id = Column(String(36), ForeignKey("uploads.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    is_ai_generated = Column(Boolean, nullable=False)
    confidence = Column(Float, nullable=False)
    scores = Column(JSON, nullable=False)
    model_version = Column(String(50), nullable=False)
    inference_ms = Column(Integer, nullable=False)
    warnings = Column(JSON, default=list)
    saliency_path = Column(String(1024), nullable=True)
    frequency_map_path = Column(String(1024), nullable=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)

    # Relationships
    upload = relationship("Upload", back_populates="prediction")
    user = relationship("User", back_populates="predictions")

    __table_args__ = (
        Index("ix_predictions_created_at", "created_at"),
    )

    def __repr__(self):
        return f"<Prediction {'AI' if self.is_ai_generated else 'Real'} ({self.confidence:.1%})>"


class AnalyticsEvent(Base):
    __tablename__ = "analytics_events"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    event_type = Column(String(100), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    metadata_ = Column("metadata", JSON, default=dict)
    created_at = Column(DateTime, default=utcnow, nullable=False, index=True)

    def __repr__(self):
        return f"<AnalyticsEvent {self.event_type}>"


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    actor_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action = Column(String(100), nullable=False)
    resource_type = Column(String(100), nullable=True)
    resource_id = Column(String(36), nullable=True)
    details = Column(JSON, default=dict)
    ip_address = Column(String(45), nullable=True)
    created_at = Column(DateTime, default=utcnow, nullable=False, index=True)

    def __repr__(self):
        return f"<AuditLog {self.action} by {self.actor_id}>"
