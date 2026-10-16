"""
Security & Authentication Subsystem
- Cryptographic password hashing (PBKDF2-HMAC-SHA256 with random salt & 600,000 rounds)
- JWT Token issuance and verification with HMAC-SHA256 signature
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
from fastapi import Depends, Header, HTTPException, status
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
    extra_claims: dict[str, Any] | None = None,
) -> str:
    """Creates a signed JWT with expiration timestamp."""
    header = {"alg": "HS256", "typ": "JWT"}
    now = int(time.time())
    exp = now + (settings.JWT_EXPIRATION_HOURS * 3600)

    payload = {
        "sub": subject,
        "role": role,
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
            detail="Authentication token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return payload


# ============================================================================
# FastAPI Authentication & RBAC Dependencies
# ============================================================================

async def get_current_user_optional(
    auth: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict[str, Any] | None:
    """Returns the authenticated user payload if a valid Bearer token is provided, else None."""
    if not auth:
        return None
    try:
        return decode_access_token(auth.credentials)
    except HTTPException:
        return None


async def get_current_user(
    auth: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict[str, Any]:
    """Enforces authentication: requires a valid JWT Bearer token."""
    if not auth:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return decode_access_token(auth.credentials)


async def require_admin(
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
        return {"sub": "system_admin", "role": "admin", "via": "api_key"}

    # Check JWT Token Role
    if user and user.get("role") == "admin":
        return user

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Administrator privileges required for this action",
    )
