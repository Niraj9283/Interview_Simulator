"""
FastAPI Security Middlewares
- SecurityHeadersMiddleware (HSTS, CSP, X-Frame-Options, X-Content-Type-Options)
- RateLimiterMiddleware (Token bucket / sliding window per client IP)
- PayloadSizeLimitMiddleware (Prevents memory exhaustion / oversized upload attacks)
"""

import time
from collections import defaultdict
from threading import Lock
from typing import Callable
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.config import settings


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Applies modern enterprise security headers to every HTTP response.
    Protects against Clickjacking, MIME-Sniffing, XSS, and Protocol Downgrades.
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)

        # Security Headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(self), microphone=(self), geolocation=()"

        # HSTS (Strict-Transport-Security)
        if request.url.scheme == "https" or settings.ENV == "production":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"

        # Content-Security-Policy (API Level)
        response.headers["Content-Security-Policy"] = "default-src 'self'; frame-ancestors 'none';"

        # Strip server fingerprinting headers
        if "server" in response.headers:
            del response.headers["server"]
        if "x-powered-by" in response.headers:
            del response.headers["x-powered-by"]

        return response


class RateLimiterMiddleware(BaseHTTPMiddleware):
    """
    Sliding-window IP rate limiter.
    Limits requests to settings.RATE_LIMIT_REQUESTS_PER_MINUTE per IP.
    """

    def __init__(self, app):
        super().__init__(app)
        self.requests: dict[str, list[float]] = defaultdict(list)
        self.lock = Lock()
        self.window_seconds = 60
        self.max_requests = settings.RATE_LIMIT_REQUESTS_PER_MINUTE

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Exempt health check and websocket paths from strict rate limiting
        path = request.url.path
        if not settings.RATE_LIMIT_ENABLED or path in ("/health", "/api/edge/status") or path.startswith("/ws/"):
            return await call_next(request)

        client_ip = request.client.host if request.client else "unknown_client"
        now = time.time()

        with self.lock:
            # Prune timestamps older than window
            window_start = now - self.window_seconds
            timestamps = [ts for ts in self.requests[client_ip] if ts > window_start]

            if len(timestamps) >= self.max_requests:
                retry_after = int(self.window_seconds - (now - timestamps[0])) + 1
                return JSONResponse(
                    status_code=429,
                    content={
                        "error": "Too Many Requests",
                        "message": f"Rate limit exceeded. Maximum {self.max_requests} requests per minute allowed.",
                        "retry_after_seconds": max(1, retry_after),
                    },
                    headers={
                        "Retry-After": str(max(1, retry_after)),
                        "X-RateLimit-Limit": str(self.max_requests),
                        "X-RateLimit-Remaining": "0",
                    },
                )

            # Record this request
            timestamps.append(now)
            self.requests[client_ip] = timestamps
            remaining = self.max_requests - len(timestamps)

        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(self.max_requests)
        response.headers["X-RateLimit-Remaining"] = str(max(0, remaining))
        return response


class PayloadSizeLimitMiddleware(BaseHTTPMiddleware):
    """
    Rejects requests exceeding MAX_UPLOAD_SIZE_BYTES to prevent memory DoS attacks.
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        content_length = request.headers.get("content-length")
        if content_length:
            try:
                length = int(content_length)
                if length > settings.MAX_UPLOAD_SIZE_BYTES:
                    return JSONResponse(
                        status_code=413,
                        content={
                            "error": "Payload Too Large",
                            "message": f"Upload exceeds maximum permitted size of {settings.MAX_UPLOAD_SIZE_BYTES // (1024*1024)} MB",
                        },
                    )
            except ValueError:
                pass

        return await call_next(request)
