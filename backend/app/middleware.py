"""
FastAPI Security & Observability Middlewares
- CorrelationIdMiddleware: Generates and attaches X-Request-ID for distributed tracing
- SecurityHeadersMiddleware: HSTS, CSP, X-Frame-Options, X-Content-Type-Options
- AdvancedRateLimiterMiddleware: Tiered sliding-window rate limiter with Redis/memory backing
- PayloadSizeLimitMiddleware: Prevents memory exhaustion / oversized upload attacks
"""

import logging
import time
import uuid
from collections import defaultdict
from threading import Lock
from typing import Callable
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.config import settings

logger = logging.getLogger("mockmate.security")


class CorrelationIdMiddleware(BaseHTTPMiddleware):
    """
    Assigns or preserves a unique X-Request-ID for every incoming request.
    Enables structured audit logging and distributed error tracking.
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        request_id = request.headers.get("x-request-id") or str(uuid.uuid4())
        request.state.request_id = request_id

        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response


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
    Tiered Sliding-Window Rate Limiter.
    Applies differentiated rate limits based on endpoint sensitivity:
    - Login / Auth: 5 attempts per 15 minutes per IP
    - Password Reset: 3 attempts per 15 minutes per IP
    - Verification Resends: 3 requests per 15 minutes per IP
    - Registration: 5 requests per 15 minutes per IP
    - AI Generation / Evaluation: 30 requests per minute
    - General traffic: 60 requests per minute
    Supports optional Redis backend when REDIS_URL is configured, with safe in-memory fallback.
    """

    # Route-specific limit configurations: (max_requests, window_seconds)
    ROUTE_LIMITS: dict[str, tuple[int, int]] = {
        "/api/auth/login": (5, 900),               # 5 attempts / 15 min
        "/api/auth/register": (5, 900),            # 5 registrations / 15 min
        "/api/auth/forgot-password": (3, 900),     # 3 requests / 15 min
        "/api/auth/resend-verification": (3, 900), # 3 resends / 15 min
        "/api/auth/delete-account": (3, 900),      # 3 attempts / 15 min
        "/api/interview/start": (30, 60),          # 30 / min
        "/api/interview/evaluate": (30, 60),       # 30 / min
        "/api/rag/resume/upload": (10, 60),        # 10 / min
    }

    def __init__(self, app):
        super().__init__(app)
        self.requests: dict[str, list[float]] = defaultdict(list)
        self.lock = Lock()
        self.redis_client = None

        if settings.REDIS_URL:
            try:
                import redis
                self.redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
                logger.info("Distributed Redis rate limiter connected to %s", settings.REDIS_URL)
            except Exception as e:
                logger.warning("Redis rate limiter unavailable (%s). Using thread-safe in-memory sliding window.", e)

    def _get_client_ip(self, request: Request) -> str:
        """
        Determines the client IP safely.
        Trusts X-Forwarded-For only when coming from local reverse proxy.
        """
        remote_ip = request.client.host if request.client else "127.0.0.1"
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            # If request is from localhost or internal docker network, trust the first forwarded IP
            if remote_ip in ("127.0.0.1", "localhost", "::1", "backend") or remote_ip.startswith("172."):
                return forwarded.split(",")[0].strip()
        return remote_ip

    def _check_redis_limit(self, key: str, max_requests: int, window_seconds: int) -> tuple[bool, int, int]:
        """Sliding window rate limit via Redis zset."""
        now = time.time()
        pipe = self.redis_client.pipeline()
        window_start = now - window_seconds
        pipe.zremrangebyscore(key, 0, window_start)
        pipe.zcard(key)
        pipe.zadd(key, {f"{now}:{uuid.uuid4().hex[:6]}": now})
        pipe.expire(key, window_seconds + 5)
        results = pipe.execute()
        current_count = results[1]

        if current_count >= max_requests:
            retry_after = window_seconds
            return True, retry_after, 0
        remaining = max_requests - current_count - 1
        return False, 0, max(0, remaining)

    def _check_memory_limit(self, key: str, max_requests: int, window_seconds: int) -> tuple[bool, int, int]:
        """Sliding window rate limit via in-memory deque."""
        now = time.time()
        window_start = now - window_seconds

        with self.lock:
            timestamps = [ts for ts in self.requests[key] if ts > window_start]
            if len(timestamps) >= max_requests:
                retry_after = int(window_seconds - (now - timestamps[0])) + 1
                return True, max(1, retry_after), 0

            timestamps.append(now)
            self.requests[key] = timestamps
            remaining = max_requests - len(timestamps)
            return False, 0, max(0, remaining)

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        path = request.url.path

        # Exempt health checks and status endpoints
        if not settings.RATE_LIMIT_ENABLED or path in ("/health", "/api/edge/status") or path.startswith("/ws/"):
            return await call_next(request)

        # Determine limit rule for path
        max_requests, window_seconds = self.ROUTE_LIMITS.get(
            path,
            (settings.RATE_LIMIT_REQUESTS_PER_MINUTE, 60),
        )

        client_ip = self._get_client_ip(request)
        rate_key = f"ratelimit:{client_ip}:{path}"

        is_limited = False
        retry_after = 60
        remaining = 0

        if self.redis_client:
            try:
                is_limited, retry_after, remaining = self._check_redis_limit(rate_key, max_requests, window_seconds)
            except Exception:
                is_limited, retry_after, remaining = self._check_memory_limit(rate_key, max_requests, window_seconds)
        else:
            is_limited, retry_after, remaining = self._check_memory_limit(rate_key, max_requests, window_seconds)

        if is_limited:
            logger.warning("Rate limit exceeded for %s on %s (Limit: %d/%ds)", client_ip, path, max_requests, window_seconds)
            return JSONResponse(
                status_code=429,
                content={
                    "error": "Too Many Requests",
                    "message": f"Rate limit reached for this endpoint. Please retry after {retry_after} seconds.",
                    "retry_after_seconds": retry_after,
                },
                headers={
                    "Retry-After": str(retry_after),
                    "X-RateLimit-Limit": str(max_requests),
                    "X-RateLimit-Remaining": "0",
                },
            )

        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(max_requests)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
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
