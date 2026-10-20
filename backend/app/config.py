"""
Application Security & System Configuration
Loads configuration from environment variables with safe production defaults.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load local environment configuration
_env_candidates = [
    Path(__file__).resolve().parents[1] / ".env",
    Path(__file__).resolve().parents[2] / ".env.local",
    Path(__file__).resolve().parents[2] / ".env",
]
for _candidate in _env_candidates:
    if _candidate.exists():
        load_dotenv(_candidate)


class Settings:
    # Environment & Debug
    ENV: str = os.getenv("ENVIRONMENT", "development").lower()
    DEBUG: bool = os.getenv("DEBUG", "false" if ENV == "production" else "true").lower() in ("true", "1", "yes")

    # Base Application URL (for generating email verification and password reset links)
    APP_URL: str = os.getenv("APP_URL", os.getenv("NEXT_PUBLIC_APP_URL", "http://localhost:3000")).rstrip("/")

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
    JWT_EXPIRATION_HOURS: int = int(os.getenv("JWT_EXPIRATION_HOURS", "168"))
    EMAIL_VERIFICATION_EXPIRATION_HOURS: int = int(os.getenv("EMAIL_VERIFICATION_EXPIRATION_HOURS", "24"))
    PASSWORD_RESET_EXPIRATION_MINUTES: int = int(os.getenv("PASSWORD_RESET_EXPIRATION_MINUTES", "30"))

    # Admin Headless Access Token
    ADMIN_API_KEY: str = os.getenv(
        "ADMIN_API_KEY",
        "mockmate-admin-sec-key-change-in-prod-77a8b9",
    )

    # Database Configuration
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    BACKUP_DIR: Path = Path(os.getenv("BACKUP_DIR", str(Path(__file__).resolve().parents[1] / "data" / "backups")))

    # Email Delivery (Resend / SMTP)
    RESEND_API_KEY: str = os.getenv("RESEND_API_KEY", "")
    EMAIL_FROM: str = os.getenv("EMAIL_FROM", os.getenv("FEEDBACK_FROM_EMAIL", "MockMate AI <onboarding@resend.dev>"))
    FEEDBACK_TO_EMAIL: str = os.getenv("FEEDBACK_TO_EMAIL", "support@mockmate.ai")

    # Distributed Rate Limiting & Cache
    REDIS_URL: str = os.getenv("REDIS_URL", "")

    # Error Tracking (Sentry)
    SENTRY_DSN: str = os.getenv("SENTRY_DSN", "")

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
    AUTH_RATE_LIMIT_MAX_ATTEMPTS: int = int(os.getenv("AUTH_RATE_LIMIT_MAX_ATTEMPTS", "5"))
    AUTH_RATE_LIMIT_WINDOW_SECONDS: int = int(os.getenv("AUTH_RATE_LIMIT_WINDOW_SECONDS", "900"))  # 15 min

    # File Upload & Input Guards
    MAX_UPLOAD_SIZE_BYTES: int = int(os.getenv("MAX_UPLOAD_SIZE_BYTES", str(10 * 1024 * 1024)))  # 10 MB limit
    MAX_TEXT_INPUT_LENGTH: int = int(os.getenv("MAX_TEXT_INPUT_LENGTH", "50000"))

    # Vector DB / Chroma
    CHROMA_ALLOW_RESET: bool = os.getenv("CHROMA_ALLOW_RESET", "false").lower() in ("true", "1", "yes")

    # OpenAPI Docs Control (Disable in production unless authenticated or explicitly enabled)
    DOCS_ENABLED: bool = os.getenv("DOCS_ENABLED", "false" if ENV == "production" else "true").lower() in ("true", "1", "yes")

    def validate_production_readiness(self) -> None:
        """Enforces safe credentials in production mode."""
        if self.ENV == "production":
            insecure_defaults = [
                "mockmate-insecure-dev-secret",
                "mockmate_secret_key_change_me",
                "mockmate-jwt-dev-secret",
                "mockmate_jwt_secret_change_me",
                "mockmate-admin-sec-key",
                "mockmate_admin_key_change_me",
            ]
            for val in [self.SECRET_KEY, self.JWT_SECRET, self.ADMIN_API_KEY]:
                for default_prefix in insecure_defaults:
                    if default_prefix in val:
                        raise ValueError(
                            f"SECURITY VIOLATION: Production environment cannot run with default insecure secret '{val[:15]}...'. "
                            "Please configure SECRET_KEY, JWT_SECRET, and ADMIN_API_KEY with strong cryptographically random values."
                        )


settings = Settings()
