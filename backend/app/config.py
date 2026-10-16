"""
Application Security & System Configuration
Loads configuration from environment variables with safe production defaults.
"""

import os
from pathlib import Path


class Settings:
    # Environment & Debug
    ENV: str = os.getenv("ENVIRONMENT", "production").lower()
    DEBUG: bool = os.getenv("DEBUG", "false").lower() in ("true", "1", "yes")

    # Cryptographic Secrets
    SECRET_KEY: str = os.getenv(
        "SECRET_KEY",
        "mockmate-insecure-dev-secret-change-in-production-f8a92b3c4d5e",
    )
    JWT_SECRET: str = os.getenv(
        "JWT_SECRET",
        "mockmate-jwt-dev-secret-change-in-production-a1b2c3d4e5f6",
    )
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_HOURS: int = int(os.getenv("JWT_EXPIRATION_HOURS", "24"))

    # Admin Headless Access Token
    ADMIN_API_KEY: str = os.getenv(
        "ADMIN_API_KEY",
        "mockmate-admin-sec-key-change-in-prod-77a8b9",
    )

    # CORS Whitelist (Strict, no wildcard '*' when credentials enabled)
    ALLOWED_ORIGINS: list[str] = [
        origin.strip()
        for origin in os.getenv(
            "ALLOWED_ORIGINS",
            "http://localhost:3000,http://127.0.0.1:3000",
        ).split(",")
        if origin.strip() and origin.strip() != "*"
    ]

    # Rate Limiting
    RATE_LIMIT_ENABLED: bool = os.getenv("RATE_LIMIT_ENABLED", "true").lower() in ("true", "1", "yes")
    RATE_LIMIT_REQUESTS_PER_MINUTE: int = int(os.getenv("RATE_LIMIT_REQUESTS_PER_MINUTE", "60"))

    # File Upload & Input Guards
    MAX_UPLOAD_SIZE_BYTES: int = int(os.getenv("MAX_UPLOAD_SIZE_BYTES", str(10 * 1024 * 1024)))  # 10 MB limit
    MAX_TEXT_INPUT_LENGTH: int = int(os.getenv("MAX_TEXT_INPUT_LENGTH", "50000"))

    # Vector DB / Chroma
    CHROMA_ALLOW_RESET: bool = os.getenv("CHROMA_ALLOW_RESET", "false").lower() in ("true", "1", "yes")

    # OpenAPI Docs Control (Disable in production unless authenticated or explicitly enabled)
    DOCS_ENABLED: bool = os.getenv("DOCS_ENABLED", "false" if ENV == "production" else "true").lower() in ("true", "1", "yes")


settings = Settings()
