from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.session import get_db
from app.core.deps import require_admin
from app.models.user import User
from app.models.secret import Secret
from app.models.audit import AuditLog
from app.schemas.auth import UserResponse
from app.schemas.audit import AuditLogResponse, SystemStatsResponse
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/admin", tags=["Administration & Security Oversight"])

@router.get("/users", response_model=List[UserResponse])
def get_all_users(
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    [Admin Only] Retrieves all registered platform users and account states.
    """
    return db.query(User).order_by(User.created_at.desc()).all()

@router.patch("/users/{user_id}/toggle-status", response_model=UserResponse)
def toggle_user_status(
    user_id: str,
    request: Request,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    [Admin Only] Activates or deactivates a user account (incident response mitigation).
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if user.id == admin_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Administrators cannot deactivate their own account",
        )

    user.is_active = not user.is_active
    db.commit()
    db.refresh(user)

    action_label = "USER_ACTIVATED" if user.is_active else "USER_DEACTIVATED"
    log_audit_event(
        db=db,
        request=request,
        action=action_label,
        user_identifier=admin_user.username,
        user_id=admin_user.id,
        resource_id=user.id,
        details=f"Admin toggled active status for user '{user.username}' to {user.is_active}",
    )

    return user

@router.get("/audit-logs", response_model=List[AuditLogResponse])
def get_audit_logs(
    action: Optional[str] = Query(None, description="Filter by event action"),
    user_identifier: Optional[str] = Query(None, description="Filter by username"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    [Admin Only] Queries system-wide append-only security audit trail.
    """
    query = db.query(AuditLog)
    if action:
        query = query.filter(AuditLog.action == action)
    if user_identifier:
        query = query.filter(AuditLog.user_identifier == user_identifier)

    logs = query.order_by(AuditLog.timestamp.desc()).offset(offset).limit(limit).all()
    return logs

@router.get("/stats", response_model=SystemStatsResponse)
def get_system_stats(
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    [Admin Only] Returns system health metrics and security event summaries.
    """
    now = datetime.now(timezone.utc)
    total_users = db.query(func.count(User.id)).scalar() or 0
    total_secrets = db.query(func.count(Secret.id)).scalar() or 0
    expired_secrets = (
        db.query(func.count(Secret.id))
        .filter(Secret.expires_at.isnot(None), Secret.expires_at < now)
        .scalar()
        or 0
    )
    total_audit_events = db.query(func.count(AuditLog.id)).scalar() or 0

    return SystemStatsResponse(
        total_users=total_users,
        total_secrets=total_secrets,
        expired_secrets=expired_secrets,
        total_audit_events=total_audit_events,
    )
