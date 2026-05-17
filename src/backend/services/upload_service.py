"""
File upload service: validation, storage, and DB tracking.
"""

import os
import uuid
import logging
from pathlib import Path
from sqlalchemy.orm import Session

from ..app.config import get_settings
from ..models.db_models import Upload, generate_uuid

logger = logging.getLogger("DeepTrace.uploads")
settings = get_settings()


def ensure_upload_dir():
    """Create the upload directory if it doesn't exist."""
    Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)


def validate_file(filename: str, content_type: str, file_size: int) -> list[str]:
    """Validate file type, extension, and size. Returns list of errors."""
    errors = []

    # Check content type
    if not content_type.startswith("image/"):
        errors.append(f"Invalid content type: {content_type}. Only images are allowed.")

    # Check file extension
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in settings.allowed_extensions_list:
        errors.append(f"Unsupported file extension: .{ext}. Allowed: {', '.join(settings.allowed_extensions_list)}")

    # Check file size
    if file_size > settings.max_file_size_bytes:
        errors.append(f"File too large: {file_size / (1024*1024):.1f}MB. Maximum: {settings.MAX_FILE_SIZE_MB}MB")

    if file_size == 0:
        errors.append("Empty file uploaded")

    return errors


def save_upload(
    db: Session,
    user_id: str,
    filename: str,
    content_type: str,
    file_bytes: bytes,
) -> Upload:
    """Save file to disk and create a DB record."""
    ensure_upload_dir()

    # Generate unique stored filename to prevent collisions
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "jpg"
    stored_filename = f"{uuid.uuid4().hex}.{ext}"
    stored_path = os.path.join(settings.UPLOAD_DIR, stored_filename)

    # Write file to disk
    with open(stored_path, "wb") as f:
        f.write(file_bytes)

    # Create DB record
    upload = Upload(
        id=generate_uuid(),
        user_id=user_id,
        original_filename=filename,
        stored_path=stored_path,
        content_type=content_type,
        file_size_bytes=len(file_bytes),
    )
    db.add(upload)
    db.commit()
    db.refresh(upload)

    logger.info(f"Upload saved: {upload.id} ({filename}, {len(file_bytes)} bytes)")
    return upload


def delete_upload_file(upload: Upload) -> None:
    """Remove the physical file from disk."""
    try:
        if os.path.exists(upload.stored_path):
            os.remove(upload.stored_path)
            logger.info(f"Deleted file: {upload.stored_path}")
    except OSError as e:
        logger.error(f"Failed to delete file {upload.stored_path}: {e}")


def get_upload_by_id(db: Session, upload_id: str, user_id: str | None = None) -> Upload | None:
    query = db.query(Upload).filter(Upload.id == upload_id)
    if user_id:
        query = query.filter(Upload.user_id == user_id)
    return query.first()
