import secrets
import logging
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
import jwt

from app.db.session import get_db
from app.core.config import settings
from app.core.security import hash_password, verify_password
from app.core.jwt import create_access_token, create_mfa_token, decode_token
from app.core.limiter import limiter
from app.core.deps import get_current_user, security_scheme
from app.models.user import User
from app.models.otp import OtpVerification
from app.models.blacklist import TokenBlacklist
from app.schemas.auth import (
    UserRegister,
    UserLogin,
    LoginStep1Response,
    OtpVerifyRequest,
    TokenResponse,
    UserResponse,
)
from app.services.audit_service import log_audit_event

logger = logging.getLogger("uvicorn.error")
router = APIRouter(prefix="/auth", tags=["Authentication & MFA"])

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
def register(request: Request, user_in: UserRegister, db: Session = Depends(get_db)):
    """
    Onboards a new user with strong password validation and bcrypt hashing (12 rounds).
    Rate-limited to 10 registrations per minute per IP.
    """
    existing_user = db.query(User).filter(
        (User.username == user_in.username) | (User.email == user_in.email)
    ).first()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or email is already registered",
        )

    hashed_pw = hash_password(user_in.password)
    user = User(
        username=user_in.username,
        email=user_in.email,
        password_hash=hashed_pw,
        role="DEVELOPER",
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    log_audit_event(
        db=db,
        request=request,
        action="USER_REGISTERED",
        user_identifier=user.username,
        user_id=user.id,
        resource_id=user.id,
        details=f"New user registered with role {user.role}",
    )
    return user

@router.post("/login", response_model=LoginStep1Response)
@limiter.limit("5/minute")
def login_step_1(request: Request, creds: UserLogin, db: Session = Depends(get_db)):
    """
    Step 1 of Multi-Factor Authentication:
    Verifies username and password using bcrypt. If valid, generates a 6-digit OTP
    with a 5-minute TTL and outputs it to the server console.
    Rate-limited to 5 requests per minute per IP to mitigate brute force attacks.
    """
    user = db.query(User).filter(User.username == creds.username).first()
    
    if not user or not verify_password(creds.password, user.password_hash):
        log_audit_event(
            db=db,
            request=request,
            action="LOGIN_FAILED",
            user_identifier=creds.username,
            details="Invalid credentials provided during Step 1 login",
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated. Contact an administrator.",
        )

    # Invalidate previous unused OTPs for this user
    db.query(OtpVerification).filter(
        OtpVerification.user_id == user.id,
        OtpVerification.is_used == False,
    ).update({"is_used": True})

    # Generate 6-digit cryptographically secure OTP
    otp_code = str(secrets.randbelow(900000) + 100000)
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(minutes=5)

    otp_record = OtpVerification(
        user_id=user.id,
        otp_code=otp_code,
        expires_at=expires_at,
        attempts=0,
        is_used=False,
    )
    db.add(otp_record)
    db.commit()

    # Log to server console for offline lab demonstration
    print("\n" + "="*70)
    print(f" [MFA CONSOLE DELIVERY] User: '{user.username}' | Role: '{user.role}'")
    print(f" >>> ONE-TIME PASSWORD (OTP): {otp_code} <<< (Valid for 5 minutes)")
    print("="*70 + "\n")

    mfa_token = create_mfa_token(user_id=user.id, username=user.username)

    mock_otp_value = otp_code if settings.MOCK_OTP_MODE else None

    return LoginStep1Response(
        message="Primary authentication successful. Enter the 6-digit OTP to proceed.",
        mfa_token=mfa_token,
        mock_otp=mock_otp_value,
    )

@router.post("/verify-otp", response_model=TokenResponse)
@limiter.limit("10/minute")
def verify_otp_step_2(request: Request, otp_in: OtpVerifyRequest, db: Session = Depends(get_db)):
    """
    Step 2 of Multi-Factor Authentication:
    Validates intermediate mfa_token and the 6-digit OTP.
    Enforces maximum 3 attempts and 5-minute expiration before granting a 30-min JWT.
    """
    try:
        payload = decode_token(otp_in.mfa_token)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired MFA session token. Please re-login.",
        )

    if payload.get("token_type") != "mfa_pending":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type for OTP verification",
        )

    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    otp_record = (
        db.query(OtpVerification)
        .filter(
            OtpVerification.user_id == user.id,
            OtpVerification.is_used == False,
        )
        .order_by(OtpVerification.created_at.desc())
        .first()
    )

    if not otp_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No pending OTP request found. Please log in again.",
        )

    # Check attempt limit
    if otp_record.attempts >= 3:
        otp_record.is_used = True
        db.commit()
        log_audit_event(
            db=db,
            request=request,
            action="MFA_LOCKED",
            user_identifier=user.username,
            user_id=user.id,
            details="OTP locked out due to exceeding 3 failed attempts",
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Too many failed attempts. This OTP has been invalidated.",
        )

    # Check expiration
    now = datetime.now(timezone.utc)
    if otp_record.expires_at < now:
        otp_record.is_used = True
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OTP has expired. Please initiate login again.",
        )

    # Validate OTP value
    if otp_record.otp_code != otp_in.otp_code:
        otp_record.attempts += 1
        db.commit()
        log_audit_event(
            db=db,
            request=request,
            action="MFA_FAILED",
            user_identifier=user.username,
            user_id=user.id,
            details=f"Incorrect OTP attempt ({otp_record.attempts}/3)",
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid OTP code. {3 - otp_record.attempts} attempt(s) remaining.",
        )

    # Mark OTP as successfully used
    otp_record.is_used = True
    db.commit()

    # Generate 30-minute JWT Access Token
    access_token, jti = create_access_token(
        user_id=user.id,
        username=user.username,
        role=user.role,
    )

    log_audit_event(
        db=db,
        request=request,
        action="USER_LOGIN_SUCCESS",
        user_identifier=user.username,
        user_id=user.id,
        details=f"Authenticated via MFA with role {user.role}",
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        role=user.role,
        username=user.username,
    )

@router.post("/logout")
def logout(
    request: Request,
    current_user: User = Depends(get_current_user),
    credentials = Depends(security_scheme),
    db: Session = Depends(get_db),
):
    """
    Revokes the current JWT by recording its unique jti in the database blacklist table.
    Enforces immediate session termination.
    """
    token = credentials.credentials
    try:
        payload = decode_token(token)
        jti = payload.get("jti")
        exp_timestamp = payload.get("exp")
        exp_datetime = datetime.fromtimestamp(exp_timestamp, tz=timezone.utc) if exp_timestamp else datetime.now(timezone.utc) + timedelta(minutes=30)
        
        blacklist_entry = TokenBlacklist(jti=jti, expires_at=exp_datetime)
        db.add(blacklist_entry)
        db.commit()

        log_audit_event(
            db=db,
            request=request,
            action="USER_LOGOUT",
            user_identifier=current_user.username,
            user_id=current_user.id,
            details="User logged out and token was blacklisted",
        )
    except Exception as exc:
        logger.error(f"Error blacklisting token on logout: {exc}")

    return {"message": "Logged out successfully. Token has been invalidated."}

@router.get("/me", response_model=UserResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """
    Returns profile information of currently authenticated user.
    """
    return current_user
