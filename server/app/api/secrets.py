from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.deps import get_current_user
from app.core.crypto import encrypt_secret, decrypt_secret, generate_masked_preview
from app.models.user import User
from app.models.secret import Secret
from app.schemas.secret import (
    SecretCreate,
    SecretUpdate,
    SecretResponse,
    SecretRevealResponse,
)
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/secrets", tags=["Secrets Management"])

def _format_secret_response(secret: Secret) -> SecretResponse:
    now = datetime.now(timezone.utc)
    is_exp = bool(secret.expires_at and secret.expires_at < now)
    return SecretResponse(
        id=secret.id,
        name=secret.name,
        secret_type=secret.secret_type,
        environment=secret.environment,
        masked_preview=secret.masked_preview,
        description=secret.description,
        expires_at=secret.expires_at,
        created_at=secret.created_at,
        updated_at=secret.updated_at,
        is_expired=is_exp,
    )

@router.get("", response_model=List[SecretResponse])
def list_secrets(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieves stored credentials for the authenticated developer (or all secrets if Admin).
    Returns masked previews only to prevent shoulder surfing.
    """
    if current_user.role == "ADMIN":
        secrets = db.query(Secret).order_by(Secret.created_at.desc()).all()
    else:
        secrets = db.query(Secret).filter(Secret.owner_id == current_user.id).order_by(Secret.created_at.desc()).all()

    return [_format_secret_response(s) for s in secrets]

@router.post("", response_model=SecretResponse, status_code=status.HTTP_201_CREATED)
def create_secret(
    request: Request,
    secret_in: SecretCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Encrypts sensitive data with AES-256-GCM and stores the ciphertext alongside
    the fresh nonce and GCM auth tag. Records a SECRET_CREATED audit log.
    """
    encrypted_blob = encrypt_secret(secret_in.secret_value)
    masked = generate_masked_preview(secret_in.secret_value)

    secret = Secret(
        owner_id=current_user.id,
        name=secret_in.name,
        secret_type=secret_in.secret_type,
        environment=secret_in.environment,
        encrypted_value=encrypted_blob,
        masked_preview=masked,
        description=secret_in.description,
        expires_at=secret_in.expires_at,
    )
    db.add(secret)
    db.commit()
    db.refresh(secret)

    log_audit_event(
        db=db,
        request=request,
        action="SECRET_CREATED",
        user_identifier=current_user.username,
        user_id=current_user.id,
        resource_id=secret.id,
        details=f"Secret '{secret.name}' [{secret.secret_type} - {secret.environment}] encrypted & stored",
    )

    return _format_secret_response(secret)

@router.get("/{secret_id}/reveal", response_model=SecretRevealResponse)
def reveal_secret(
    secret_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Decrypts an AES-256-GCM encrypted secret upon explicit request.
    Verifies cryptographic integrity tag and role permissions.
    Immediately records a SECRET_REVEALED audit event with caller IP and timestamp.
    """
    secret = db.query(Secret).filter(Secret.id == secret_id).first()
    if not secret:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Secret not found")

    # RBAC check: only owner or admin can decrypt
    if secret.owner_id != current_user.id and current_user.role != "ADMIN":
        log_audit_event(
            db=db,
            request=request,
            action="UNAUTHORIZED_REVEAL_ATTEMPT",
            user_identifier=current_user.username,
            user_id=current_user.id,
            resource_id=secret.id,
            details=f"User attempted unauthorized decryption of secret '{secret.name}'",
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You do not have permission to decrypt this secret",
        )

    try:
        decrypted_val = decrypt_secret(secret.encrypted_value)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Decryption failed: {str(exc)}",
        )

    now = datetime.now(timezone.utc)
    log_audit_event(
        db=db,
        request=request,
        action="SECRET_REVEALED",
        user_identifier=current_user.username,
        user_id=current_user.id,
        resource_id=secret.id,
        details=f"Secret '{secret.name}' decrypted and revealed on client",
    )

    return SecretRevealResponse(
        id=secret.id,
        name=secret.name,
        decrypted_value=decrypted_val,
        masked_preview=secret.masked_preview,
        revealed_at=now,
        auto_remask_seconds=15,
    )

@router.put("/{secret_id}", response_model=SecretResponse)
def update_secret(
    secret_id: str,
    request: Request,
    secret_in: SecretUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Updates secret metadata and/or rotates the secret value with a fresh AES-256-GCM key nonce.
    """
    secret = db.query(Secret).filter(Secret.id == secret_id).first()
    if not secret:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Secret not found")

    if secret.owner_id != current_user.id and current_user.role != "ADMIN":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied")

    if secret_in.name is not None:
        secret.name = secret_in.name
    if secret_in.secret_type is not None:
        secret.secret_type = secret_in.secret_type
    if secret_in.environment is not None:
        secret.environment = secret_in.environment
    if secret_in.description is not None:
        secret.description = secret_in.description
    if secret_in.expires_at is not None:
        secret.expires_at = secret_in.expires_at

    if secret_in.secret_value is not None:
        # Re-encrypt with fresh nonce
        secret.encrypted_value = encrypt_secret(secret_in.secret_value)
        secret.masked_preview = generate_masked_preview(secret_in.secret_value)

    db.commit()
    db.refresh(secret)

    log_audit_event(
        db=db,
        request=request,
        action="SECRET_UPDATED",
        user_identifier=current_user.username,
        user_id=current_user.id,
        resource_id=secret.id,
        details=f"Secret '{secret.name}' updated / rotated",
    )

    return _format_secret_response(secret)

@router.delete("/{secret_id}")
def delete_secret(
    secret_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Deletes a credential and logs a SECRET_DELETED audit event.
    """
    secret = db.query(Secret).filter(Secret.id == secret_id).first()
    if not secret:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Secret not found")

    if secret.owner_id != current_user.id and current_user.role != "ADMIN":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied")

    secret_name = secret.name
    db.delete(secret)
    db.commit()

    log_audit_event(
        db=db,
        request=request,
        action="SECRET_DELETED",
        user_identifier=current_user.username,
        user_id=current_user.id,
        resource_id=secret_id,
        details=f"Secret '{secret_name}' permanently deleted",
    )

    return {"message": f"Secret '{secret_name}' deleted successfully"}
