from typing import Optional
from fastapi import Request
from sqlalchemy.orm import Session
from app.models.audit import AuditLog

def log_audit_event(
    db: Session,
    request: Request,
    action: str,
    user_identifier: str,
    user_id: Optional[str] = None,
    resource_id: Optional[str] = None,
    details: Optional[str] = None,
) -> AuditLog:
    """
    Inserts an append-only audit trail record capturing security-critical actions,
    actor identity, client IP, and browser user-agent.
    """
    # Extract client IP, prioritizing X-Forwarded-For if behind a proxy
    ip = request.client.host if request.client else "127.0.0.1"
    x_forwarded = request.headers.get("x-forwarded-for")
    if x_forwarded:
        ip = x_forwarded.split(",")[0].strip()

    user_agent = request.headers.get("user-agent", "Unknown")[:255]

    audit_entry = AuditLog(
        user_id=user_id,
        user_identifier=user_identifier,
        action=action,
        resource_id=resource_id,
        details=details,
        ip_address=ip,
        user_agent=user_agent,
    )
    db.add(audit_entry)
    db.commit()
    db.refresh(audit_entry)
    return audit_entry
