import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, Tuple
import jwt
from app.core.config import settings

def create_access_token(
    user_id: str,
    username: str,
    role: str,
    expires_delta: Optional[timedelta] = None
) -> Tuple[str, str]:
    """
    Generates an HMAC-SHA256 signed JWT with a unique jti (JWT ID).
    Returns (token_string, jti).
    """
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    jti = str(uuid.uuid4())
    payload: Dict[str, Any] = {
        "sub": user_id,
        "username": username,
        "role": role,
        "jti": jti,
        "token_type": "access",
        "iat": now,
        "exp": expire,
    }
    
    encoded_jwt = jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt, jti

def create_mfa_token(user_id: str, username: str) -> str:
    """
    Generates a short-lived (5-minute) intermediate token to link Step 1 (password verification)
    with Step 2 (OTP verification). Does not grant access to protected secrets.
    """
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=5)
    
    payload: Dict[str, Any] = {
        "sub": user_id,
        "username": username,
        "token_type": "mfa_pending",
        "jti": str(uuid.uuid4()),
        "iat": now,
        "exp": expire,
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def decode_token(token: str) -> Dict[str, Any]:
    """
    Decodes and validates a JWT signature and expiration.
    Raises jwt.PyJWTError on invalid or expired token.
    """
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
