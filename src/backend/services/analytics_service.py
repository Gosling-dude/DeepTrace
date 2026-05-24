"""
Analytics event tracking service.
Records user actions and computes aggregate statistics.

Performance note: All trend queries use single GROUP BY aggregations
instead of per-day loops to minimize database round-trips — critical
for serverless databases like Neon where each query has ~80ms latency.
"""

import logging
from datetime import datetime, timezone, timedelta, date
from sqlalchemy.orm import Session
from sqlalchemy import func, case, cast, Date

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
    """Compute aggregate prediction statistics in a single query."""
    row = db.query(
        func.count(Prediction.id).label("total"),
        func.count(case((Prediction.is_ai_generated == True, 1))).label("ai_count"),
        func.coalesce(func.avg(Prediction.confidence), 0.0).label("avg_conf"),
        func.coalesce(func.avg(Prediction.inference_ms), 0.0).label("avg_ms"),
    ).first()

    total = row.total if row else 0
    ai_count = row.ai_count if row else 0
    avg_conf = float(row.avg_conf) if row else 0.0
    avg_ms = float(row.avg_ms) if row else 0.0

    total_uploads = db.query(func.count(Upload.id)).scalar() or 0

    return {
        "total_predictions": total,
        "ai_detected_count": ai_count,
        "real_detected_count": total - ai_count,
        "avg_confidence": round(avg_conf, 4),
        "avg_inference_ms": round(avg_ms, 1),
        "total_uploads": total_uploads,
    }


def get_error_rate(db: Session) -> float:
    """Calculate error rate from analytics events in a single query."""
    now = datetime.now(timezone.utc)
    since = now - timedelta(days=30)

    row = db.query(
        func.count(case((AnalyticsEvent.event_type == "prediction_request", 1))).label("total"),
        func.count(case((AnalyticsEvent.event_type == "prediction_error", 1))).label("errors"),
    ).filter(
        AnalyticsEvent.created_at >= since,
        AnalyticsEvent.event_type.in_(["prediction_request", "prediction_error"]),
    ).first()

    total = row.total if row else 0
    errors = row.errors if row else 0

    if total == 0:
        return 0.0
    return round(errors / total, 4)


def _build_date_range(days: int) -> dict[str, int]:
    """Build a zero-filled date dictionary for the last N days."""
    today = datetime.now(timezone.utc).date()
    start = today - timedelta(days=days - 1)
    return {
        (start + timedelta(days=i)).isoformat(): 0
        for i in range(days)
    }


def get_daily_predictions(db: Session, days: int = 30) -> list[dict]:
    """Get prediction count per day using a single GROUP BY query."""
    now = datetime.now(timezone.utc)
    since = (now - timedelta(days=days - 1)).replace(hour=0, minute=0, second=0, microsecond=0)

    date_map = _build_date_range(days)

    rows = (
        db.query(
            cast(Prediction.created_at, Date).label("day"),
            func.count(Prediction.id).label("cnt"),
        )
        .filter(Prediction.created_at >= since)
        .group_by("day")
        .all()
    )

    for row in rows:
        day_str = row.day.isoformat() if isinstance(row.day, date) else str(row.day)
        if day_str in date_map:
            date_map[day_str] = row.cnt

    return [{"date": d, "count": c} for d, c in date_map.items()]


def get_daily_signups(db: Session, days: int = 30) -> list[dict]:
    """Get user signup count per day using a single GROUP BY query."""
    now = datetime.now(timezone.utc)
    since = (now - timedelta(days=days - 1)).replace(hour=0, minute=0, second=0, microsecond=0)

    date_map = _build_date_range(days)

    rows = (
        db.query(
            cast(User.created_at, Date).label("day"),
            func.count(User.id).label("cnt"),
        )
        .filter(User.created_at >= since)
        .group_by("day")
        .all()
    )

    for row in rows:
        day_str = row.day.isoformat() if isinstance(row.day, date) else str(row.day)
        if day_str in date_map:
            date_map[day_str] = row.cnt

    return [{"date": d, "count": c} for d, c in date_map.items()]


def get_confidence_distribution(db: Session) -> list[dict]:
    """Get histogram bins of confidence scores in a single query."""
    bins = [
        (0.5, 0.6), (0.6, 0.7), (0.7, 0.8), (0.8, 0.9), (0.9, 1.01),
    ]

    # Build all bins in a single query using CASE expressions
    cases = []
    for low, high in bins:
        cases.append(
            func.count(case(
                (
                    (Prediction.confidence >= low) & (Prediction.confidence < high),
                    1,
                )
            )).label(f"bin_{int(low*10)}")
        )

    row = db.query(*cases).first()

    result = []
    for i, (low, high) in enumerate(bins):
        count = getattr(row, f"bin_{int(low*10)}", 0) if row else 0
        result.append({"range": f"{low:.1f}-{high:.1f}", "count": count})
    return result


def get_ai_vs_real_trend(db: Session, days: int = 30) -> list[dict]:
    """AI vs Real detections per day using a single GROUP BY query."""
    now = datetime.now(timezone.utc)
    since = (now - timedelta(days=days - 1)).replace(hour=0, minute=0, second=0, microsecond=0)

    date_map_ai = _build_date_range(days)
    date_map_real = _build_date_range(days)

    rows = (
        db.query(
            cast(Prediction.created_at, Date).label("day"),
            func.count(case((Prediction.is_ai_generated == True, 1))).label("ai"),
            func.count(case((Prediction.is_ai_generated == False, 1))).label("real"),
        )
        .filter(Prediction.created_at >= since)
        .group_by("day")
        .all()
    )

    for row in rows:
        day_str = row.day.isoformat() if isinstance(row.day, date) else str(row.day)
        if day_str in date_map_ai:
            date_map_ai[day_str] = row.ai
            date_map_real[day_str] = row.real

    return [
        {"date": d, "ai": date_map_ai[d], "real": date_map_real[d]}
        for d in date_map_ai
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
