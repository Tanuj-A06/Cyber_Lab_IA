import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    PROJECT_NAME: str = "Secure API Key and Secret Manager"
    API_V1_STR: str = "/api"
    
    # NeonDB PostgreSQL connection string
    DATABASE_URL: str = Field(
        default="postgresql://postgres:postgres@localhost:5432/secrets_db",
        description="NeonDB PostgreSQL connection URL"
    )
    
    # JWT authentication settings
    SECRET_KEY: str = Field(..., description="JWT signing secret key")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # AES-256 Master Key (Hex string representing 32 bytes)
    MASTER_ENCRYPTION_KEY: str = Field(..., description="64-char hex string for AES-256-GCM")
    
    # Lab demonstration mode: prints OTP in server logs & returns in payload for quick verification
    MOCK_OTP_MODE: bool = True
    
    # CORS allowed origins
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"
    
    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
