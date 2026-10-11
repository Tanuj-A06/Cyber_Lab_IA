import uuid
from sqlalchemy import Column, String, DateTime
from sqlalchemy.sql import func
from app.db.session import Base

class TokenBlacklist(Base):
    __tablename__ = "token_blacklist"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    jti = Column(String(64), unique=True, index=True, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
