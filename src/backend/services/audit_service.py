"""
Audit logging service for security-sensitive actions.
"""

import logging
from sqlalchemy.orm import Session

from ..models.db_models import AuditLog, generate_uuid

logger = logging.getLogger("DeepTrace.audit")


def log_audit(
    db: Session,
    actor_id: str | None,
    action: str,
    resource_type: str | None = None,
    resource_id: str | None = None,
    details: dict | None = None,
    ip_address: str | None = None,
) -> None:
    """Create an audit log entry."""
    entry = AuditLog(
        id=generate_uuid(),
        actor_id=actor_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        details=details or {},
        ip_address=ip_address,
    )
    db.add(entry)
    db.commit()
    logger.info(f"Audit: {action} by {actor_id} on {resource_type}/{resource_id}")


def get_audit_logs(
    db: Session,
    page: int = 1,
    per_page: int = 50,
    action_filter: str | None = None,
    actor_filter: str | None = None,
):
    """Retrieve paginated audit logs with optional filters."""
    query = db.query(AuditLog)

    if action_filter:
        query = query.filter(AuditLog.action == action_filter)
    if actor_filter:
        query = query.filter(AuditLog.actor_id == actor_filter)

    total = query.count()
    logs = (
        query
        .order_by(AuditLog.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )
    return logs, total
