"""
Analytics event tracking service.
Records user actions and computes aggregate statistics.
"""

import logging
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func, case, and_

from ..models.db_models import AnalyticsEvent, Prediction, Upload, User, generate_uuid

logger = logging.getLogger("DeepTrace.analytics")


def track_event(
    db: Session,
    event_type: str,
    user_id: str | None = None,
    metadata: dict | None = None,
) -> None:
    """Record an analytics event."""
    event = AnalyticsEvent(
        id=generate_uuid(),
        event_type=event_type,
        user_id=user_id,
        metadata_=metadata or {},
    )
    db.add(event)
    db.commit()


def get_prediction_stats(db: Session) -> dict:
    """Compute aggregate prediction statistics."""
    total = db.query(Prediction).count()
    if total == 0:
        return {
            "total_predictions": 0,
            "ai_detected_count": 0,
            "real_detected_count": 0,
            "avg_confidence": 0.0,
            "avg_inference_ms": 0.0,
            "total_uploads": db.query(Upload).count(),
        }

    ai_count = db.query(Prediction).filter(Prediction.is_ai_generated == True).count()
    real_count = total - ai_count

    avg_conf = db.query(func.avg(Prediction.confidence)).scalar() or 0.0
    avg_ms = db.query(func.avg(Prediction.inference_ms)).scalar() or 0.0

    return {
        "total_predictions": total,
        "ai_detected_count": ai_count,
        "real_detected_count": real_count,
        "avg_confidence": round(float(avg_conf), 4),
        "avg_inference_ms": round(float(avg_ms), 1),
        "total_uploads": db.query(Upload).count(),
    }


def get_error_rate(db: Session) -> float:
    """Calculate error rate from analytics events."""
    now = datetime.now(timezone.utc)
    since = now - timedelta(days=30)

    total_requests = db.query(AnalyticsEvent).filter(
        AnalyticsEvent.event_type == "prediction_request",
        AnalyticsEvent.created_at >= since,
    ).count()

    error_requests = db.query(AnalyticsEvent).filter(
        AnalyticsEvent.event_type == "prediction_error",
        AnalyticsEvent.created_at >= since,
    ).count()

    if total_requests == 0:
        return 0.0
    return round(error_requests / total_requests, 4)


def get_daily_predictions(db: Session, days: int = 30) -> list[dict]:
    """Get prediction count per day for the last N days."""
    now = datetime.now(timezone.utc)
    since = now - timedelta(days=days)

    # Build day-by-day counts
    results = []
    for i in range(days):
        day_start = (since + timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        count = db.query(Prediction).filter(
            Prediction.created_at >= day_start,
            Prediction.created_at < day_end,
        ).count()
        results.append({"date": day_start.strftime("%Y-%m-%d"), "count": count})

    return results


def get_daily_signups(db: Session, days: int = 30) -> list[dict]:
    """Get user signup count per day for the last N days."""
    now = datetime.now(timezone.utc)
    since = now - timedelta(days=days)

    results = []
    for i in range(days):
        day_start = (since + timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        count = db.query(User).filter(
            User.created_at >= day_start,
            User.created_at < day_end,
        ).count()
        results.append({"date": day_start.strftime("%Y-%m-%d"), "count": count})

    return results


def get_confidence_distribution(db: Session) -> list[dict]:
    """Get histogram bins of confidence scores."""
    bins = [
        (0.5, 0.6), (0.6, 0.7), (0.7, 0.8), (0.8, 0.9), (0.9, 1.01),
    ]
    result = []
    for low, high in bins:
        count = db.query(Prediction).filter(
            Prediction.confidence >= low,
            Prediction.confidence < high,
        ).count()
        result.append({"range": f"{low:.1f}-{high:.1f}", "count": count})
    return result


def get_ai_vs_real_trend(db: Session, days: int = 30) -> list[dict]:
    """AI vs Real detections per day."""
    now = datetime.now(timezone.utc)
    since = now - timedelta(days=days)

    results = []
    for i in range(days):
        day_start = (since + timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        ai = db.query(Prediction).filter(
            Prediction.created_at >= day_start,
            Prediction.created_at < day_end,
            Prediction.is_ai_generated == True,
        ).count()
        real = db.query(Prediction).filter(
            Prediction.created_at >= day_start,
            Prediction.created_at < day_end,
            Prediction.is_ai_generated == False,
        ).count()
        results.append({
            "date": day_start.strftime("%Y-%m-%d"),
            "ai": ai,
            "real": real,
        })
    return results


def get_recent_activity(db: Session, limit: int = 20) -> list[dict]:
    """Get recent analytics events for the activity feed."""
    events = (
        db.query(AnalyticsEvent)
        .order_by(AnalyticsEvent.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": e.id,
            "event_type": e.event_type,
            "user_id": e.user_id,
            "metadata": e.metadata_,
            "created_at": e.created_at.isoformat(),
        }
        for e in events
    ]
