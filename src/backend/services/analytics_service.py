"""
Analytics event tracking service.
Records user actions and computes aggregate statistics.

Performance: All trend queries fetch minimal data in a single query
and aggregate in Python — avoids per-day loops and database-specific
SQL functions for maximum compatibility and speed.
"""

import logging
from datetime import datetime, timezone, timedelta
from collections import defaultdict
from sqlalchemy.orm import Session
from sqlalchemy import func

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
    total = db.query(func.count(Prediction.id)).scalar() or 0

    if total == 0:
        return {
            "total_predictions": 0,
            "ai_detected_count": 0,
            "real_detected_count": 0,
            "avg_confidence": 0.0,
            "avg_inference_ms": 0.0,
            "total_uploads": db.query(func.count(Upload.id)).scalar() or 0,
        }

    ai_count = db.query(func.count(Prediction.id)).filter(
        Prediction.is_ai_generated == True
    ).scalar() or 0

    avg_conf = db.query(func.avg(Prediction.confidence)).scalar() or 0.0
    avg_ms = db.query(func.avg(Prediction.inference_ms)).scalar() or 0.0
    total_uploads = db.query(func.count(Upload.id)).scalar() or 0

    return {
        "total_predictions": total,
        "ai_detected_count": ai_count,
        "real_detected_count": total - ai_count,
        "avg_confidence": round(float(avg_conf), 4),
        "avg_inference_ms": round(float(avg_ms), 1),
        "total_uploads": total_uploads,
    }


def get_error_rate(db: Session) -> float:
    """Calculate error rate from analytics events."""
    now = datetime.now(timezone.utc)
    since = now - timedelta(days=30)

    total_requests = db.query(func.count(AnalyticsEvent.id)).filter(
        AnalyticsEvent.event_type == "prediction_request",
        AnalyticsEvent.created_at >= since,
    ).scalar() or 0

    error_requests = db.query(func.count(AnalyticsEvent.id)).filter(
        AnalyticsEvent.event_type == "prediction_error",
        AnalyticsEvent.created_at >= since,
    ).scalar() or 0

    if total_requests == 0:
        return 0.0
    return round(error_requests / total_requests, 4)


def _build_empty_date_range(days: int) -> list[str]:
    """Build a sorted list of date strings for the last N days."""
    today = datetime.now(timezone.utc).date()
    start = today - timedelta(days=days - 1)
    return [(start + timedelta(days=i)).isoformat() for i in range(days)]


def get_daily_predictions(db: Session, days: int = 30) -> list[dict]:
    """Get prediction count per day — single query, Python aggregation."""
    now = datetime.now(timezone.utc)
    since = (now - timedelta(days=days - 1)).replace(hour=0, minute=0, second=0, microsecond=0)

    # Single query: fetch only the created_at timestamps
    rows = (
        db.query(Prediction.created_at)
        .filter(Prediction.created_at >= since)
        .all()
    )

    # Aggregate by day in Python
    counts = defaultdict(int)
    for (created_at,) in rows:
        if created_at:
            day_str = created_at.strftime("%Y-%m-%d")
            counts[day_str] += 1

    # Build zero-filled result
    dates = _build_empty_date_range(days)
    return [{"date": d, "count": counts.get(d, 0)} for d in dates]


def get_daily_signups(db: Session, days: int = 30) -> list[dict]:
    """Get user signup count per day — single query, Python aggregation."""
    now = datetime.now(timezone.utc)
    since = (now - timedelta(days=days - 1)).replace(hour=0, minute=0, second=0, microsecond=0)

    rows = (
        db.query(User.created_at)
        .filter(User.created_at >= since)
        .all()
    )

    counts = defaultdict(int)
    for (created_at,) in rows:
        if created_at:
            day_str = created_at.strftime("%Y-%m-%d")
            counts[day_str] += 1

    dates = _build_empty_date_range(days)
    return [{"date": d, "count": counts.get(d, 0)} for d in dates]


def get_confidence_distribution(db: Session) -> list[dict]:
    """Get histogram bins of confidence scores — single query, Python binning."""
    rows = db.query(Prediction.confidence).all()

    bins = [
        (0.5, 0.6), (0.6, 0.7), (0.7, 0.8), (0.8, 0.9), (0.9, 1.01),
    ]
    bin_counts = [0] * len(bins)

    for (conf,) in rows:
        if conf is not None:
            for i, (low, high) in enumerate(bins):
                if low <= conf < high:
                    bin_counts[i] += 1
                    break

    return [
        {"range": f"{low:.1f}-{high:.1f}", "count": bin_counts[i]}
        for i, (low, high) in enumerate(bins)
    ]


def get_ai_vs_real_trend(db: Session, days: int = 30) -> list[dict]:
    """AI vs Real detections per day — single query, Python aggregation."""
    now = datetime.now(timezone.utc)
    since = (now - timedelta(days=days - 1)).replace(hour=0, minute=0, second=0, microsecond=0)

    rows = (
        db.query(Prediction.created_at, Prediction.is_ai_generated)
        .filter(Prediction.created_at >= since)
        .all()
    )

    ai_counts = defaultdict(int)
    real_counts = defaultdict(int)

    for created_at, is_ai in rows:
        if created_at:
            day_str = created_at.strftime("%Y-%m-%d")
            if is_ai:
                ai_counts[day_str] += 1
            else:
                real_counts[day_str] += 1

    dates = _build_empty_date_range(days)
    return [
        {"date": d, "ai": ai_counts.get(d, 0), "real": real_counts.get(d, 0)}
        for d in dates
    ]


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
