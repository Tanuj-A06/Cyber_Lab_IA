import os
import base64
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.exceptions import InvalidTag
from app.core.config import settings

def _get_master_key() -> bytes:
    """
    Parses and validates the 32-byte (256-bit) AES Master Encryption Key from settings.
    """
    hex_key = settings.MASTER_ENCRYPTION_KEY.strip()
    try:
        key_bytes = bytes.fromhex(hex_key)
    except ValueError as exc:
        raise ValueError("MASTER_ENCRYPTION_KEY must be a valid hex-encoded string") from exc

    if len(key_bytes) != 32:
        raise ValueError(
            f"Invalid AES key length: expected 32 bytes (64 hex characters), got {len(key_bytes)} bytes."
        )
    return key_bytes

def encrypt_secret(plaintext: str) -> str:
    """
    Encrypts sensitive data using AES-256 in Galois/Counter Mode (GCM).
    
    Security properties:
    - Confidentiality: AES-256 block cipher.
    - Integrity/Authenticity: GCM mode calculates an authentication tag.
    - Uniqueness: A fresh 12-byte cryptographic nonce is generated per encryption.
    
    Output Format: Base64( Nonce [12 bytes] + Ciphertext + Auth Tag [16 bytes] )
    """
    master_key = _get_master_key()
    aesgcm = AESGCM(master_key)
    
    # 12-byte random nonce (RFC 5116 standard for GCM)
    nonce = os.urandom(12)
    plaintext_bytes = plaintext.encode("utf-8")
    
    # AESGCM.encrypt returns ciphertext with 16-byte auth tag appended
    encrypted_blob = aesgcm.encrypt(nonce, plaintext_bytes, None)
    
    # Combine nonce + encrypted_blob (which includes tag)
    combined = nonce + encrypted_blob
    return base64.b64encode(combined).decode("utf-8")

def decrypt_secret(encoded_payload: str) -> str:
    """
    Decrypts an AES-256-GCM encoded payload.
    
    Verifies the authentication tag before returning plaintext.
    If the ciphertext or nonce has been altered, an InvalidTag exception is raised.
    """
    master_key = _get_master_key()
    aesgcm = AESGCM(master_key)
    
    try:
        combined = base64.b64decode(encoded_payload)
    except Exception as exc:
        raise ValueError("Failed to base64-decode encrypted payload") from exc

    if len(combined) < 28: # 12 bytes nonce + 16 bytes auth tag minimum
        raise ValueError("Encrypted payload is corrupted or too short")

    nonce = combined[:12]
    ciphertext_with_tag = combined[12:]
    
    try:
        decrypted_bytes = aesgcm.decrypt(nonce, ciphertext_with_tag, None)
        return decrypted_bytes.decode("utf-8")
    except InvalidTag as exc:
        # Cryptographic tamper detection alert
        raise ValueError("Cryptographic Integrity Check Failed: Ciphertext has been tampered with or key is invalid.") from exc

def generate_masked_preview(secret_value: str) -> str:
    """
    Generates a secure masked representation of the credential to prevent shoulder surfing.
    Example: 'sk_live_9837492837498234' -> 'sk_li••••••••8234'
    """
    val = secret_value.strip()
    if len(val) <= 8:
        return "••••••••"
    if len(val) <= 16:
        return f"{val[:2]}••••••••{val[-2:]}"
    return f"{val[:5]}••••••••{val[-4:]}"
