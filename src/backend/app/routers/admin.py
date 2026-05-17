"""
Admin router: platform stats, user management, audit logs, analytics.
All routes require admin role.
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies import require_admin
from ..schemas import (
    PlatformStats, AnalyticsTrends, UserListResponse, UserResponse,
    AuditLogResponse, RoleUpdateRequest, StatusUpdateRequest, MessageResponse,
)
from ...services.user_service import (
    list_users, get_user_by_id, set_user_role, set_user_active, get_user_stats,
)
from ...services.analytics_service import (
    get_prediction_stats, get_error_rate, get_daily_predictions,
    get_daily_signups, get_confidence_distribution, get_ai_vs_real_trend,
    get_recent_activity,
)
from ...services.audit_service import get_audit_logs, log_audit
from ...models.db_models import User

logger = logging.getLogger("DeepTrace.admin.router")

router = APIRouter(prefix="/api/v1/admin", tags=["Admin"])


@router.get("/stats", response_model=PlatformStats)
async def get_platform_stats(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Get comprehensive platform statistics. Admin only."""
    user_stats = get_user_stats(db)
    pred_stats = get_prediction_stats(db)
    error_rate = get_error_rate(db)

    return PlatformStats(
        total_users=user_stats["total_users"],
        active_users_today=user_stats["active_users_today"],
        active_users_week=user_stats["active_users_week"],
        active_users_month=user_stats["active_users_month"],
        total_uploads=pred_stats["total_uploads"],
        total_predictions=pred_stats["total_predictions"],
        ai_detected_count=pred_stats["ai_detected_count"],
        real_detected_count=pred_stats["real_detected_count"],
        avg_confidence=pred_stats["avg_confidence"],
        avg_inference_ms=pred_stats["avg_inference_ms"],
        error_rate=error_rate,
    )


@router.get("/users", response_model=UserListResponse)
async def admin_list_users(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: str = Query(None),
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """List all users with search and pagination. Admin only."""
    users, total = list_users(db, page=page, per_page=per_page, search=search)
    return UserListResponse(
        users=[UserResponse.model_validate(u) for u in users],
        total=total,
        page=page,
        per_page=per_page,
    )


@router.get("/users/{user_id}", response_model=UserResponse)
async def admin_get_user(
    user_id: str,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Get detailed info for a specific user. Admin only."""
    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


@router.put("/users/{user_id}/role", response_model=UserResponse)
async def admin_update_role(
    user_id: str,
    body: RoleUpdateRequest,
    request: Request,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Change a user's role. Admin only."""
    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if user.id == admin.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot change your own role")

    old_role = user.role
    user = set_user_role(db, user, body.role)

    log_audit(
        db, admin.id, "role_changed", "user", user_id,
        details={"old_role": old_role, "new_role": body.role},
        ip_address=request.client.host if request.client else None,
    )

    return user


@router.put("/users/{user_id}/status", response_model=UserResponse)
async def admin_update_status(
    user_id: str,
    body: StatusUpdateRequest,
    request: Request,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Activate or deactivate a user. Admin only."""
    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if user.id == admin.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot deactivate yourself")

    user = set_user_active(db, user, body.is_active)

    log_audit(
        db, admin.id, "status_changed", "user", user_id,
        details={"is_active": body.is_active},
        ip_address=request.client.host if request.client else None,
    )

    return user


@router.get("/analytics/trends", response_model=AnalyticsTrends)
async def get_analytics_trends(
    days: int = Query(30, ge=7, le=90),
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Get time-series analytics data. Admin only."""
    return AnalyticsTrends(
        daily_predictions=get_daily_predictions(db, days),
        daily_signups=get_daily_signups(db, days),
        confidence_distribution=get_confidence_distribution(db),
        ai_vs_real_trend=get_ai_vs_real_trend(db, days),
    )


@router.get("/audit-logs", response_model=AuditLogResponse)
async def admin_audit_logs(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    action: str = Query(None),
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """View audit logs with filtering and pagination. Admin only."""
    logs, total = get_audit_logs(db, page=page, per_page=per_page, action_filter=action)
    return AuditLogResponse(
        logs=logs,
        total=total,
        page=page,
        per_page=per_page,
    )


@router.get("/activity")
async def get_recent_admin_activity(
    limit: int = Query(20, ge=1, le=100),
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Get recent platform activity feed. Admin only."""
    return get_recent_activity(db, limit=limit)


@router.get("/health")
async def admin_health(admin: User = Depends(require_admin)):
    """Extended system health for admin. Admin only."""
    import platform
    import sys
    return {
        "status": "healthy",
        "python_version": sys.version,
        "platform": platform.platform(),
        "system": platform.system(),
    }
