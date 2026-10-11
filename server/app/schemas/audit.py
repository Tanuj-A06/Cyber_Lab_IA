from datetime import datetime
from typing import Optional
from pydantic import BaseModel

class AuditLogResponse(BaseModel):
    id: str
    user_identifier: str
    action: str
    resource_id: Optional[str] = None
    details: Optional[str] = None
    ip_address: str
    user_agent: Optional[str] = None
    timestamp: datetime

    class Config:
        from_attributes = True

class SystemStatsResponse(BaseModel):
    total_users: int
    total_secrets: int
    expired_secrets: int
    total_audit_events: int
