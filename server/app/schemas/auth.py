import re
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, field_validator

class UserRegister(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, description="Alphanumeric username")
    email: EmailStr = Field(..., description="Valid email address")
    password: str = Field(..., min_length=8, max_length=128, description="Strong password")

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str) -> str:
        if not re.match(r"^[a-zA-Z0-9_-]+$", v):
            raise ValueError("Username can only contain alphanumeric characters, underscores, and dashes")
        return v

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not re.search(r"[0-9]", v):
            raise ValueError("Password must contain at least one digit")
        if not re.search(r"[\W_]", v):
            raise ValueError("Password must contain at least one special character")
        return v

class UserLogin(BaseModel):
    username: str
    password: str

class LoginStep1Response(BaseModel):
    message: str
    mfa_token: str
    mock_otp: Optional[str] = None  # Returned during offline lab demo mode for easy evaluation

class OtpVerifyRequest(BaseModel):
    mfa_token: str
    otp_code: str = Field(..., min_length=6, max_length=6)

    @field_validator("otp_code")
    @classmethod
    def validate_otp_digits(cls, v: str) -> str:
        if not re.match(r"^\d{6}$", v):
            raise ValueError("OTP must be exactly 6 numeric digits")
        return v

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    username: str

class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    role: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
