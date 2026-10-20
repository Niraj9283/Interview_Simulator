"""
Security & Authentication Subsystem
- Cryptographic password hashing (PBKDF2-HMAC-SHA256 with random salt & 600,000 rounds)
- JWT Token issuance and verification with HMAC-SHA256 signature
- Cryptographic single-use token generation and hashing (SHA-256)
- Cookie and Header Bearer token extraction
- Role-Based Access Control (RBAC): Admin, Interviewer, Candidate
- FastAPI dependencies for route authentication and admin protection
"""

import base64
import hashlib
import hmac
import json
import secrets
import time
from typing import Any, Literal
from fastapi import Depends, Header, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import settings

# HTTP Bearer scheme
bearer_scheme = HTTPBearer(auto_error=False)

UserRole = Literal["admin", "interviewer", "candidate"]


# ============================================================================
# Password Hashing & Verification (OWASP PBKDF2-HMAC-SHA256)
# ============================================================================

def hash_password(password: str) -> str:
    """
    Hashes a password with a cryptographically secure 16-byte salt using
    PBKDF2-HMAC-SHA256 with 600,000 iterations (OWASP recommendation).
    Format: pbkdf2_sha256$<iterations>$<salt_hex>$<hash_hex>
    """
    salt = secrets.token_bytes(16)
    iterations = 600000
    derived_key = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        iterations,
    )
    return f"pbkdf2_sha256${iterations}${salt.hex()}${derived_key.hex()}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifies a plain password against the stored PBKDF2 hash using constant-time comparison.
    """
    try:
        parts = hashed_password.split("$")
        if len(parts) != 4 or parts[0] != "pbkdf2_sha256":
            return False

        iterations = int(parts[1])
        salt = bytes.fromhex(parts[2])
        expected_hash = bytes.fromhex(parts[3])

        test_key = hashlib.pbkdf2_hmac(
            "sha256",
            plain_password.encode("utf-8"),
            salt,
            iterations,
        )
        return hmac.compare_digest(test_key, expected_hash)
    except Exception:
        return False


# ============================================================================
# Opaque Token Generation & Hashing (Verification & Reset)
# ============================================================================

def generate_secure_token(nbytes: int = 32) -> str:
    """Generates a high-entropy URL-safe cryptographic token."""
    return secrets.token_urlsafe(nbytes)


def hash_token(raw_token: str) -> str:
    """Hashes a raw token using SHA-256 so plaintext tokens are never stored."""
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def verify_token_hash(raw_token: str, stored_hash: str) -> bool:
    """Constant-time verification of raw token against stored SHA-256 hash."""
    computed_hash = hash_token(raw_token)
    return hmac.compare_digest(computed_hash, stored_hash)


# ============================================================================
# Lightweight Cryptographic JWT (HS256)
# ============================================================================

def _base64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _base64url_decode(data: str) -> bytes:
    padding = "=" * (4 - (len(data) % 4))
    return base64.urlsafe_b64decode((data + padding).encode("ascii"))


def create_access_token(
    subject: str,
    role: UserRole = "candidate",
    token_version: int = 1,
    extra_claims: dict[str, Any] | None = None,
    expires_in_hours: int | None = None,
) -> str:
    """Creates a signed JWT with expiration timestamp and token version for revocation."""
    header = {"alg": "HS256", "typ": "JWT"}
    now = int(time.time())
    hours = expires_in_hours or settings.JWT_EXPIRATION_HOURS
    exp = now + (hours * 3600)

    payload = {
        "sub": subject,
        "role": role,
        "tv": token_version,
        "iat": now,
        "exp": exp,
        **(extra_claims or {}),
    }

    header_b64 = _base64url_encode(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    payload_b64 = _base64url_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    message = f"{header_b64}.{payload_b64}".encode("ascii")

    signature = hmac.new(
        settings.JWT_SECRET.encode("utf-8"),
        message,
        hashlib.sha256,
    ).digest()
    sig_b64 = _base64url_encode(signature)

    return f"{header_b64}.{payload_b64}.{sig_b64}"


def decode_access_token(token: str) -> dict[str, Any]:
    """Decodes and validates a signed JWT token."""
    parts = token.split(".")
    if len(parts) != 3:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    header_b64, payload_b64, sig_b64 = parts
    message = f"{header_b64}.{payload_b64}".encode("ascii")

    expected_sig = hmac.new(
        settings.JWT_SECRET.encode("utf-8"),
        message,
        hashlib.sha256,
    ).digest()

    try:
        actual_sig = _base64url_decode(sig_b64)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token signature encoding",
        ) from exc

    if not hmac.compare_digest(expected_sig, actual_sig):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token signature",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = json.loads(_base64url_decode(payload_b64).decode("utf-8"))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        ) from exc

    now = int(time.time())
    if payload.get("exp", 0) < now:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication session has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return payload


# ============================================================================
# FastAPI Authentication & RBAC Dependencies
# ============================================================================

def _extract_token_from_request(
    request: Request,
    auth: HTTPAuthorizationCredentials | None,
) -> str | None:
    """Extracts token either from Authorization header or HttpOnly cookie."""
    if auth and auth.credentials:
        return auth.credentials
    cookie_token = request.cookies.get("mockmate_token")
    if cookie_token:
        return cookie_token
    # Also support X-Auth-Token header if forwarded by proxy
    return request.headers.get("x-auth-token")


async def get_current_user_optional(
    request: Request,
    auth: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict[str, Any] | None:
    """Returns the authenticated user payload if a valid Bearer token or cookie is provided, else None."""
    token = _extract_token_from_request(request, auth)
    if not token:
        return None
    try:
        payload = decode_access_token(token)
        # Verify token_version against current database state if user exists
        from app.user_db import get_user_by_email
        db_user = get_user_by_email(payload["sub"])
        if not db_user or not db_user.get("is_active"):
            return None
        # Check token version revocation
        if payload.get("tv", 1) != db_user.get("token_version", 1):
            return None
        payload["user_id"] = db_user["id"]
        payload["email_verified"] = bool(db_user.get("email_verified", 0))
        payload["onboarding_completed"] = bool(db_user.get("onboarding_completed", 0))
        return payload
    except HTTPException:
        return None
    except Exception:
        return None


async def get_current_user(
    request: Request,
    auth: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict[str, Any]:
    """Enforces authentication: requires a valid JWT Bearer token or HttpOnly cookie."""
    token = _extract_token_from_request(request, auth)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = decode_access_token(token)
    from app.user_db import get_user_by_email
    db_user = get_user_by_email(payload["sub"])
    if not db_user or not db_user.get("is_active"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is inactive or no longer exists",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if payload.get("tv", 1) != db_user.get("token_version", 1):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has been revoked. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload["user_id"] = db_user["id"]
    payload["email_verified"] = bool(db_user.get("email_verified", 0))
    payload["onboarding_completed"] = bool(db_user.get("onboarding_completed", 0))
    return payload


async def require_verified_user(
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    """Enforces that the user has verified their email address."""
    if not current_user.get("email_verified"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email address must be verified before accessing this resource.",
        )
    return current_user


async def require_admin(
    request: Request,
    user: dict[str, Any] | None = Depends(get_current_user_optional),
    x_admin_key: str | None = Header(None, alias="X-Admin-API-Key"),
) -> dict[str, Any]:
    """
    Enforces Admin authorization.
    Can be satisfied either by:
    1. A valid JWT token with role="admin"
    2. A valid X-Admin-API-Key header matching settings.ADMIN_API_KEY
    """
    # Check Header API Key
    if x_admin_key and hmac.compare_digest(x_admin_key, settings.ADMIN_API_KEY):
        return {"sub": "system_admin", "role": "admin", "via": "api_key", "user_id": 1}

    # Check JWT Token Role
    if user and user.get("role") == "admin":
        return user

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Administrator privileges required for this action",
    )
