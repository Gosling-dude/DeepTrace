"""
User management service: profile updates, deletion, admin queries.
"""

import logging
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func, case

from ..models.db_models import User
from .auth_service import hash_password

logger = logging.getLogger("DeepTrace.users")


def get_user_by_id(db: Session, user_id: str) -> User | None:
    return db.query(User).filter(User.id == user_id).first()


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.query(User).filter(User.email == email.lower().strip()).first()


def update_user_profile(db: Session, user: User, full_name: str | None = None, email: str | None = None) -> User:
    if full_name is not None:
        user.full_name = full_name.strip()
    if email is not None:
        existing = db.query(User).filter(User.email == email.lower().strip(), User.id != user.id).first()
        if existing:
            raise ValueError("Email already in use")
        user.email = email.lower().strip()

    user.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)
    return user


def update_user_password(db: Session, user: User, new_password: str) -> None:
    user.password_hash = hash_password(new_password)
    user.updated_at = datetime.now(timezone.utc)
    db.commit()


def delete_user(db: Session, user: User) -> None:
    logger.info(f"Deleting user: {user.email}")
    db.delete(user)
    db.commit()


def set_user_role(db: Session, user: User, role: str) -> User:
    user.role = role
    user.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)
    return user


def set_user_active(db: Session, user: User, is_active: bool) -> User:
    user.is_active = is_active
    user.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)
    return user


def list_users(db: Session, page: int = 1, per_page: int = 20, search: str | None = None):
    query = db.query(User)
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (User.email.ilike(search_term)) | (User.full_name.ilike(search_term))
        )

    total = query.count()
    users = query.order_by(User.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()
    return users, total


def get_user_stats(db: Session) -> dict:
    now = datetime.now(timezone.utc)
    day_ago = now - timedelta(days=1)
    week_ago = now - timedelta(weeks=1)
    month_ago = now - timedelta(days=30)

    row = db.query(
        func.count(User.id).label("total"),
        func.count(case((
            (User.last_login >= day_ago) & (User.is_active == True), 1
        ))).label("today"),
        func.count(case((
            (User.last_login >= week_ago) & (User.is_active == True), 1
        ))).label("week"),
        func.count(case((
            (User.last_login >= month_ago) & (User.is_active == True), 1
        ))).label("month"),
    ).first()

    return {
        "total_users": row.total if row else 0,
        "active_users_today": row.today if row else 0,
        "active_users_week": row.week if row else 0,
        "active_users_month": row.month if row else 0,
    }

