import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.db import repository as repo
from app.db.client import client
from app.services.llm_client import ai_configured, get_llm


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.mongo_ok = False
    if settings.DATABASE_BACKEND.lower() == "mongo":
        try:
            await asyncio.wait_for(client.admin.command("ping"), timeout=2.0)
            app.state.mongo_ok = True
        except Exception:
            app.state.mongo_ok = False
    else:
        await repo.init_db()
        app.state.mongo_ok = False
    yield
    if settings.DATABASE_BACKEND.lower() == "mongo":
        client.close()


app = FastAPI(title="ScamShield AI", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.api.v1 import admin, auth, chat, community, scan
from app.middleware.rate_limit import RateLimitMiddleware
from app.middleware.security_headers import SecurityHeadersMiddleware

app.add_middleware(RateLimitMiddleware, max_requests=100, window_seconds=60)
app.add_middleware(SecurityHeadersMiddleware)

app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(scan.router, prefix="/api/v1/scan", tags=["scan"])
app.include_router(chat.router, prefix="/api/v1/chat", tags=["chat"])
app.include_router(community.router, prefix="/api/v1/community", tags=["community"])
app.include_router(admin.router, prefix="/api/v1/admin", tags=["admin"])


@app.get("/")
async def root():
    return {
        "app": "ScamShield AI API",
        "status": "running",
        "frontend": "http://localhost:3000",
        "docs": "/docs",
        "health": "/api/v1/health",
    }


@app.get("/api/v1/health")
async def health():
    mongo_status = "connected" if getattr(app.state, "mongo_ok", False) else "unavailable"
    _, model, provider = get_llm()
    return {
        "status": "ok",
        "service": "ScamShield AI",
        "database": settings.DATABASE_BACKEND,
        "mongodb": mongo_status,
        "ai_provider": provider,
        "ai_model": model or None,
        "ai_configured": ai_configured(),
    }
