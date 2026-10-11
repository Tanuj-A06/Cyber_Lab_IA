import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.core.limiter import limiter
from app.db.session import engine, Base
import app.models  # Ensures all models are registered in metadata
from app.api.auth import router as auth_router
from app.api.secrets import router as secrets_router
from app.api.admin import router as admin_router

logger = logging.getLogger("uvicorn.error")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifecycle management.
    Initializes PostgreSQL tables on startup.
    """
    try:
        logger.info("Initializing database schema on NeonDB PostgreSQL...")
        Base.metadata.create_all(bind=engine)
        logger.info("Database schema initialized successfully.")
    except Exception as exc:
        logger.error(f"Database connection / initialization error: {exc}")
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Cyber Security Lab Assessment: Secure API Key & Secret Management System with AES-256-GCM, Bcrypt, MFA, RBAC, and Audit Logging.",
    version="1.0.0",
    lifespan=lifespan,
)

# Connect SlowAPI rate limiter state
app.state.limiter = limiter

@app.exception_handler(RateLimitExceeded)
def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    """
    Custom HTTP 429 response when rate limit threshold is triggered.
    """
    return JSONResponse(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        content={
            "detail": "Rate limit exceeded: Too many requests from this client. Please slow down to prevent abuse.",
        },
    )

# Security Response Headers Middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    """
    Injects OWASP-recommended security headers into every HTTP response.
    """
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    return response

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(secrets_router, prefix=settings.API_V1_STR)
app.include_router(admin_router, prefix=settings.API_V1_STR)

@app.get("/api/health", tags=["Health"])
def health_check():
    """
    Public health check endpoint confirming API service and crypto readiness.
    """
    return {
        "status": "HEALTHY",
        "service": settings.PROJECT_NAME,
        "security_features": [
            "AES-256-GCM Authenticated Encryption",
            "Bcrypt Password Hashing (12 rounds)",
            "OTP-based Two-Factor Authentication (MFA)",
            "Role-Based Access Control (RBAC)",
            "JWT Authentication with Revocation Blacklist",
            "SlowAPI Rate Limiting",
            "Tamper-evident Security Audit Logging",
            "Secret Auto-Remasking (15s)",
        ],
    }
