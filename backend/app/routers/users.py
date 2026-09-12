import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.core.config import settings
from app.core.email import mail_configured, send_password_reset_email
from app.models.user import User, PasswordResetToken
from app.schemas.user import (
    UserOut,
    UserCreate,
    UserLogin,
    Token,
    ForgotPasswordRequest,
    ResetPasswordRequest,
)
from app.core.security import hash_password, verify_password, create_access_token
from app.core.deps import get_current_user

router = APIRouter(prefix="/users", tags=["users"])

RESET_TOKEN_TTL_MINUTES = 30


@router.get("/", response_model=list[UserOut])
def list_users(db: Session = Depends(get_db)):
    return db.query(User).all()


@router.post("/register", response_model=UserOut)
def register_user(user: UserCreate, db: Session = Depends(get_db)):
    existing = (
        db.query(User)
        .filter((User.email == user.email) | (User.username == user.username))
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=400, detail="Email or username already registered"
        )

    new_user = User(
        email=user.email,
        username=user.username,
        hashed_password=hash_password(user.password),
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.post("/login", response_model=Token)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == credentials.email).first()
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token(data={"sub": str(user.id)})
    return {"access_token": token, "token_type": "bearer"}


@router.get("/me", response_model=UserOut)
def read_current_user(current_user: User = Depends(get_current_user)):
    return current_user


def _hash_token(raw_token: str) -> str:
    """Reset tokens are stored hashed, so a DB leak can't be replayed."""
    return hashlib.sha256(raw_token.encode()).hexdigest()


@router.post("/forgot-password")
def forgot_password(
    payload: ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.email == payload.email).first()

    if user:
        # Retire any outstanding links so only the newest one works.
        db.query(PasswordResetToken).filter(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.used_at.is_(None),
        ).update({"used_at": datetime.now(timezone.utc)}, synchronize_session=False)

        raw_token = secrets.token_urlsafe(32)
        db.add(
            PasswordResetToken(
                user_id=user.id,
                token_hash=_hash_token(raw_token),
                expires_at=datetime.now(timezone.utc)
                + timedelta(minutes=RESET_TOKEN_TTL_MINUTES),
            )
        )
        db.commit()

        reset_link = f"{settings.frontend_url}/reset-password?token={raw_token}"

        if mail_configured():
            # Sent after the response is returned, so a slow relay never
            # delays the request.
            background_tasks.add_task(
                send_password_reset_email,
                user.email,
                reset_link,
                RESET_TOKEN_TTL_MINUTES,
            )
        else:
            # No SMTP credentials yet - fall back to the server log.
            print(f"[PASSWORD RESET] {user.email} -> {reset_link}")

    # Identical response either way - never reveal whether an email is registered.
    return {"message": "If that email is registered, a reset link is on its way."}


@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    invalid = HTTPException(
        status_code=400, detail="This reset link is invalid or has expired."
    )

    record = (
        db.query(PasswordResetToken)
        .filter(PasswordResetToken.token_hash == _hash_token(payload.token))
        .first()
    )

    if (
        not record
        or record.used_at is not None
        or record.expires_at < datetime.now(timezone.utc)
    ):
        raise invalid

    user = db.query(User).filter(User.id == record.user_id).first()
    if not user:
        raise invalid

    user.hashed_password = hash_password(payload.new_password)
    record.used_at = datetime.now(timezone.utc)
    db.commit()

    return {"message": "Password updated. You can sign in now."}
