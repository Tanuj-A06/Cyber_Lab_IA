import uuid
from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.session import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    user_identifier = Column(String(100), nullable=False)
    action = Column(String(50), nullable=False)  # USER_LOGIN, MFA_VERIFIED, SECRET_CREATED, SECRET_REVEALED, etc.
    resource_id = Column(String(100), nullable=True)
    details = Column(Text, nullable=True)
    ip_address = Column(String(45), nullable=False)
    user_agent = Column(String(255), nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True, nullable=False)

    user = relationship("User", back_populates="audit_logs")
