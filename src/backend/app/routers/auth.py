"""
Authentication router: register, login, refresh, logout, profile, password reset.
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies import get_current_user
from ..schemas import (
    RegisterRequest, LoginRequest, TokenResponse, RefreshRequest,
    PasswordResetRequest, PasswordResetConfirm, UpdateProfileRequest,
    UserResponse, MessageResponse,
)
from ...services.auth_service import (
    register_user, authenticate_user, generate_tokens,
    verify_token, create_password_reset_token,
)
from ...services.user_service import (
    update_user_profile, update_user_password, delete_user, get_user_by_email,
)
from ...services.analytics_service import track_event
from ...services.audit_service import log_audit
from ...models.db_models import User

logger = logging.getLogger("DeepTrace.auth.router")

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest, request: Request, db: Session = Depends(get_db)):
    """Create a new user account and return auth tokens."""
    try:
        user = register_user(db, body.email, body.password, body.full_name)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))

    tokens = generate_tokens(user)

    # Track analytics & audit
    track_event(db, "user_registered", user_id=user.id, metadata={"email": user.email})
    log_audit(db, user.id, "register", "user", user.id, ip_address=request.client.host if request.client else None)

    return tokens


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, request: Request, db: Session = Depends(get_db)):
    """Authenticate with email + password and receive JWT tokens."""
    user = authenticate_user(db, body.email, body.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    tokens = generate_tokens(user)

    track_event(db, "user_login", user_id=user.id)
    log_audit(db, user.id, "login", "user", user.id, ip_address=request.client.host if request.client else None)

    return tokens


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(body: RefreshRequest, db: Session = Depends(get_db)):
    """Exchange a valid refresh token for new access + refresh tokens."""
    payload = verify_token(body.refresh_token, expected_type="refresh")
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or deactivated",
        )

    return generate_tokens(user)


@router.post("/logout", response_model=MessageResponse)
async def logout(current_user: User = Depends(get_current_user)):
    """Log out (client should discard tokens). Server-side invalidation is a future enhancement."""
    return MessageResponse(message="Logged out successfully")


@router.get("/me", response_model=UserResponse)
async def get_profile(current_user: User = Depends(get_current_user)):
    """Get the current user's profile."""
    return current_user


@router.put("/me", response_model=UserResponse)
async def update_profile(
    body: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update the current user's profile."""
    try:
        user = update_user_profile(db, current_user, full_name=body.full_name, email=body.email)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    return user


@router.delete("/me", response_model=MessageResponse)
async def delete_account(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Permanently delete the current user's account and all associated data."""
    log_audit(
        db, current_user.id, "account_deleted", "user", current_user.id,
        ip_address=request.client.host if request.client else None,
    )
    delete_user(db, current_user)
    return MessageResponse(message="Account deleted successfully")


@router.post("/password/reset-request", response_model=MessageResponse)
async def request_password_reset(body: PasswordResetRequest, db: Session = Depends(get_db)):
    """Request a password reset. In production, this sends an email with a reset link."""
    user = get_user_by_email(db, body.email)
    if user:
        token = create_password_reset_token(user.id)
        # In production: send email with token/link
        # For dev: log the token
        logger.info(f"Password reset token for {user.email}: {token}")

    # Always return success to prevent email enumeration
    return MessageResponse(
        message="If an account exists with that email, a reset link has been sent.",
        detail="Check server logs for the reset token in development mode.",
    )


@router.post("/password/reset", response_model=MessageResponse)
async def reset_password(body: PasswordResetConfirm, db: Session = Depends(get_db)):
    """Reset password using a valid reset token."""
    payload = verify_token(body.token, expected_type="password_reset")
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token",
        )

    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    update_user_password(db, user, body.new_password)
    return MessageResponse(message="Password reset successfully")
