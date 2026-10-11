import uuid
from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.session import Base

class Secret(Base):
    __tablename__ = "secrets"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    owner_id = Column(String(36), ForeignKey("users.id"), index=True, nullable=False)
    name = Column(String(100), nullable=False)
    secret_type = Column(String(50), nullable=False)  # API_KEY, DB_PASSWORD, ACCESS_TOKEN, SSH_KEY, ENV_VAR
    environment = Column(String(20), nullable=False)  # DEVELOPMENT, STAGING, PRODUCTION
    encrypted_value = Column(Text, nullable=False)   # Base64( Nonce + Ciphertext + Tag )
    masked_preview = Column(String(50), nullable=False)
    description = Column(Text, nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    owner = relationship("User", back_populates="secrets")
