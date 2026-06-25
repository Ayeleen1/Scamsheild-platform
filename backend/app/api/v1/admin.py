from fastapi import APIRouter, Depends, HTTPException

from app.core.config import settings
from app.core.security import get_current_user
from app.db import repository as repo

router = APIRouter(tags=["admin"])


def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


@router.get("/stats")
async def admin_stats(_: dict = Depends(require_admin)):
    return await repo.admin_stats()


@router.get("/reports")
async def admin_all_reports(_: dict = Depends(require_admin)):
    return {"reports": await repo.list_all_reports(100)}


@router.get("/events")
async def admin_security_events(limit: int = 200, _: dict = Depends(require_admin)):
    limit = min(max(limit, 1), 500)
    return {"events": await repo.list_security_events(limit)}


@router.get("/key-status")
async def admin_key_status(_: dict = Depends(require_admin)):
    return {
        "virustotal_configured": bool(settings.VIRUSTOTAL_API_KEY.strip()),
        "google_safe_browsing_configured": bool(settings.GOOGLE_SAFE_BROWSING_API_KEY.strip()),
        "openai_configured": bool(settings.OPENAI_API_KEY.strip()),
        "openrouter_configured": bool(settings.OPENROUTER_API_KEY.strip()),
        "groq_configured": bool(settings.GROQ_API_KEY.strip()),
        "xai_configured": bool(settings.XAI_API_KEY.strip()),
        "jwt_secret_configured": settings.JWT_SECRET_KEY != "change-me-in-production-use-secrets-token-urlsafe",
    }
