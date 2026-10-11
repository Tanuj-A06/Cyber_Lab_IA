from datetime import datetime, timezone
from typing import Optional, Literal
from pydantic import BaseModel, Field

SecretType = Literal["API_KEY", "DB_PASSWORD", "ACCESS_TOKEN", "SSH_KEY", "ENV_VAR"]
EnvironmentType = Literal["DEVELOPMENT", "STAGING", "PRODUCTION"]

class SecretCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Name/Label of the secret")
    secret_type: SecretType = Field(default="API_KEY")
    environment: EnvironmentType = Field(default="DEVELOPMENT")
    secret_value: str = Field(..., min_length=1, max_length=4096, description="Plaintext credential to encrypt")
    description: Optional[str] = Field(default=None, max_length=500)
    expires_at: Optional[datetime] = None

class SecretUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    secret_type: Optional[SecretType] = None
    environment: Optional[EnvironmentType] = None
    secret_value: Optional[str] = Field(default=None, min_length=1, max_length=4096)
    description: Optional[str] = Field(default=None, max_length=500)
    expires_at: Optional[datetime] = None

class SecretResponse(BaseModel):
    id: str
    name: str
    secret_type: str
    environment: str
    masked_preview: str
    description: Optional[str] = None
    expires_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    is_expired: bool = False

    class Config:
        from_attributes = True

class SecretRevealResponse(BaseModel):
    id: str
    name: str
    decrypted_value: str
    masked_preview: str
    revealed_at: datetime
    auto_remask_seconds: int = 15
