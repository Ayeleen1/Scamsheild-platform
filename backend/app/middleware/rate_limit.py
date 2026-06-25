import time
from collections import defaultdict

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Lightweight in-memory rate limit — low overhead."""

    def __init__(self, app, max_requests: int = 120, window_seconds: int = 60):
        super().__init__(app)
        self.max_requests = max_requests
        self.window = window_seconds
        self.hits: dict[str, list[float]] = defaultdict(list)

    async def dispatch(self, request: Request, call_next):
        if request.url.path in ("/api/v1/health", "/", "/docs", "/openapi.json"):
            return await call_next(request)

        ip = request.client.host if request.client else "unknown"
        now = time.time()
        bucket = self.hits[ip]
        bucket[:] = [t for t in bucket if now - t < self.window]
        if len(bucket) >= self.max_requests:
            return JSONResponse(
                status_code=429,
                content={"detail": "Too many requests. Please wait a moment."},
            )
        bucket.append(now)
        return await call_next(request)
