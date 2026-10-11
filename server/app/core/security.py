import bcrypt

def hash_password(password: str) -> str:
    """
    Hashes a plaintext password using bcrypt with a salt factor of 12 rounds.
    Protects against offline brute-force and rainbow table attacks.
    """
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifies a plaintext password against a stored bcrypt hash using constant-time comparison.
    Mitigates timing attacks.
    """
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False
