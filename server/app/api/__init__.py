from app.api.auth import router as auth_router
from app.api.secrets import router as secrets_router
from app.api.admin import router as admin_router

__all__ = ["auth_router", "secrets_router", "admin_router"]
