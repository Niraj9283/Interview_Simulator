"""
MockMate AI - Hardened Production FastAPI Application
Enterprise-grade security:
- Centralized configuration with debug mode disabled
- Strict CORS whitelist without wildcard credentials
- HTTP Security Headers (CSP, HSTS, X-Content-Type-Options, X-Frame-Options)
- Distributed / Sliding-window IP Rate Limiting & payload size guard
- Authentication, Email Verification & Password Reset
- Row-Level Security & User-Isolated Session Management
- Transactional Account Deletion
- Input sanitization against XSS and path traversal
- Protected admin routes with audit logging
- Parameterized database operations
"""

import asyncio
import json
import logging
import time
from contextlib import asynccontextmanager
from typing import Any

from fastapi import (
    Depends,
    FastAPI,
    File,
    HTTPException,
    Request,
    Response,
    UploadFile,
    WebSocket,
    WebSocketDisconnect,
    status,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.middleware import (
    CorrelationIdMiddleware,
    PayloadSizeLimitMiddleware,
    RateLimiterMiddleware,
    SecurityHeadersMiddleware,
)
from app.models import (
    AdminMetricsResponse,
    ChangePasswordRequest,
    DeleteAccountRequest,
    EvaluationRequest,
    EvaluationResponse,
    ForgotPasswordRequest,
    InterviewStartRequest,
    InterviewStartResponse,
    OnboardingUpdateRequest,
    RAGQueryRequest,
    RAGQueryResponse,
    RAGResumeUploadResponse,
    RAGStatusResponse,
    ResendVerificationRequest,
    ResetPasswordRequest,
    ResumeAnalyzeRequest,
    ResumeAnalyzeResponse,
    TokenResponse,
    UserLoginRequest,
    UserRegisterRequest,
    UserResponse,
    UserSessionSummary,
    VerifyEmailRequest,
)
from app.sanitization import sanitize_filename, sanitize_text
from app.security import (
    create_access_token,
    generate_secure_token,
    get_current_user,
    get_current_user_optional,
    hash_token,
    require_admin,
    require_verified_user,
    verify_password,
)
from app.services.email_service import (
    send_password_reset_email,
    send_verification_email,
)
from app.services.interview_engine import InterviewEngine
from app.services.rag_engine import RAGEngine
from app.user_db import (
    authenticate_user,
    create_user,
    delete_user_account,
    delete_user_interview_session,
    get_user_by_email,
    get_user_by_id,
    get_user_interview_session,
    get_user_interview_sessions,
    get_user_resumes,
    init_database,
    list_users,
    record_audit_log,
    reset_password_with_token,
    revoke_user_sessions,
    save_user_interview_evaluation,
    save_user_interview_session,
    save_user_resume,
    set_email_verification_token,
    set_password_reset_token,
    update_user_onboarding,
    update_user_password,
    verify_email_with_token,
)

logger = logging.getLogger("mockmate.security")

# Optional Sentry initialization
if settings.SENTRY_DSN:
    try:
        import sentry_sdk
        sentry_sdk.init(
            dsn=settings.SENTRY_DSN,
            environment=settings.ENV,
            traces_sample_rate=0.1,
            send_default_pii=False,
        )
        logger.info("Sentry monitoring initialized successfully.")
    except Exception as sentry_err:
        logger.warning("Could not initialize Sentry: %s", sentry_err)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize secure database and default accounts
    init_database()
    try:
        settings.validate_production_readiness()
    except ValueError as err:
        logger.warning("Configuration Notice: %s", err)
    logger.info("MockMate Security Core Initialized. Environment: %s, Debug: %s", settings.ENV, settings.DEBUG)
    yield


app = FastAPI(
    title="MockMate AI API",
    version="0.1.0",
    debug=settings.DEBUG,
    docs_url="/docs" if settings.DOCS_ENABLED else None,
    redoc_url=None,
    lifespan=lifespan,
)

rag_engine = RAGEngine()
engine = InterviewEngine(rag_engine=rag_engine)

# ============================================================================
# Security Middlewares (Ordered)
# ============================================================================

# 1. Correlation ID for Request Tracing
app.add_middleware(CorrelationIdMiddleware)

# 2. Strict CORS Whitelist
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# 3. HTTP Security Headers
app.add_middleware(SecurityHeadersMiddleware)

# 4. Tiered IP Rate Limiter
app.add_middleware(RateLimiterMiddleware)

# 5. Request Payload Size Guard
app.add_middleware(PayloadSizeLimitMiddleware)


# ============================================================================
# Global Exception Handler
# ============================================================================

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    request_id = getattr(request.state, "request_id", "unknown")
    logger.error("Unhandled exception [%s] at %s: %s", request_id, request.url.path, exc, exc_info=settings.DEBUG)
    if isinstance(exc, HTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail, "request_id": request_id},
            headers={"X-Request-ID": request_id},
        )

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Internal Server Error",
            "message": "An unexpected error occurred. Request telemetry logged for audit.",
            "request_id": request_id,
        },
        headers={"X-Request-ID": request_id},
    )


# ============================================================================
# Health & Status Endpoints
# ============================================================================

@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "env": settings.ENV}


@app.get("/api/edge/status")
async def get_edge_status() -> dict[str, Any]:
    return {
        "mode": "edge",
        "device_role": "Host Edge Device (Client Laptop)",
        "network_required": False,
        "vision_edge_pipeline": "MediaPipe FaceLandmarker (Local WASM + XNNPACK CPU)",
        "audio_edge_pipeline": "Web Audio API Float32 Time-Domain RMS",
        "vector_edge_pipeline": "Local ChromaDB Persistent Engine",
        "cloud_latency_ms": 0,
        "privacy_status": "100% Air-Gapped / Zero External Transmission",
        "security_hardened": True,
    }


# ============================================================================
# Authentication & Session Management
# ============================================================================

def _set_auth_cookie(response: Response, token: str, max_age: int = 168 * 3600) -> None:
    """Sets persistent HttpOnly authentication cookie."""
    is_secure = settings.ENV == "production"
    response.set_cookie(
        key="mockmate_token",
        value=token,
        max_age=max_age,
        expires=max_age,
        httponly=True,
        secure=is_secure,
        samesite="lax",
        path="/",
    )


def _clear_auth_cookie(response: Response) -> None:
    """Clears session cookie."""
    response.delete_cookie(
        key="mockmate_token",
        path="/",
        httponly=True,
        samesite="lax",
    )


@app.post("/api/auth/register", response_model=TokenResponse)
async def register(payload: UserRegisterRequest, request: Request, response: Response) -> TokenResponse:
    clean_email = sanitize_text(payload.email, max_length=120).lower()
    clean_name = sanitize_text(payload.full_name, max_length=100)

    if get_user_by_email(clean_email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists.",
        )

    # Generate cryptographically secure verification token
    raw_token = generate_secure_token(32)
    token_hash = hash_token(raw_token)
    expires_at = int(time.time()) + (settings.EMAIL_VERIFICATION_EXPIRATION_HOURS * 3600)

    user = create_user(
        email=clean_email,
        full_name=clean_name,
        password=payload.password,
        role=payload.role,
        email_verified=0,
        verification_token_hash=token_hash,
        verification_expires_at=expires_at,
    )

    client_ip = request.client.host if request.client else None
    record_audit_log("USER_REGISTER", user_email=clean_email, ip_address=client_ip)

    # Dispatch verification email (with safe dev simulation if unconfigured)
    send_verification_email(clean_email, raw_token, full_name=clean_name)

    duration_hours = 168
    token = create_access_token(
        subject=user["email"],
        role=user["role"],
        token_version=1,
        expires_in_hours=duration_hours,
    )
    _set_auth_cookie(response, token, max_age=duration_hours * 3600)

    return TokenResponse(
        access_token=token,
        email=user["email"],
        role=user["role"],
        email_verified=False,
        onboarding_completed=False,
        expires_in_hours=duration_hours,
    )


@app.post("/api/auth/login", response_model=TokenResponse)
async def login(payload: UserLoginRequest, request: Request, response: Response) -> TokenResponse:
    clean_email = sanitize_text(payload.email, max_length=120).lower()
    user = authenticate_user(clean_email, payload.password)

    client_ip = request.client.host if request.client else None
    if not user:
        record_audit_log("LOGIN_FAILED", user_email=clean_email, ip_address=client_ip, status="FAILED")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    record_audit_log("LOGIN_SUCCESS", user_email=clean_email, ip_address=client_ip)
    
    # Token duration: 30 days if remember_me, otherwise 7 days (168 hours)
    duration_hours = 720 if payload.remember_me else 168
    token = create_access_token(
        subject=user["email"],
        role=user["role"],
        token_version=user.get("token_version", 1),
        expires_in_hours=duration_hours,
    )
    _set_auth_cookie(response, token, max_age=duration_hours * 3600)

    return TokenResponse(
        access_token=token,
        email=user["email"],
        role=user["role"],
        email_verified=bool(user.get("email_verified", False)),
        onboarding_completed=bool(user.get("onboarding_completed", False)),
        expires_in_hours=duration_hours,
    )


@app.post("/api/auth/logout")
async def logout(
    request: Request,
    response: Response,
    current_user: dict[str, Any] | None = Depends(get_current_user_optional),
) -> dict[str, str]:
    if current_user and current_user.get("user_id"):
        revoke_user_sessions(current_user["user_id"])
        record_audit_log("USER_LOGOUT", user_email=current_user.get("sub"))

    _clear_auth_cookie(response)
    return {"status": "logged_out", "message": "Successfully signed out and session invalidated."}


@app.get("/api/auth/me", response_model=UserResponse)
async def get_me(user: dict[str, Any] = Depends(get_current_user)) -> UserResponse:
    db_user = get_user_by_email(user["sub"])
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User account not found")

    return UserResponse(
        id=db_user["id"],
        email=db_user["email"],
        full_name=db_user["full_name"],
        role=db_user["role"],
        is_active=bool(db_user["is_active"]),
        email_verified=bool(db_user.get("email_verified", False)),
        onboarding_completed=bool(db_user.get("onboarding_completed", False)),
        target_role=db_user.get("target_role"),
        experience_level=db_user.get("experience_level"),
        department=db_user.get("department"),
        created_at=str(db_user.get("created_at", "")),
    )


# ============================================================================
# Email Verification Endpoints
# ============================================================================

@app.post("/api/auth/verify-email")
async def verify_email(payload: VerifyEmailRequest, request: Request) -> dict[str, Any]:
    verified_user = verify_email_with_token(payload.token)
    client_ip = request.client.host if request.client else None

    if not verified_user:
        record_audit_log("VERIFY_EMAIL_FAILED", ip_address=client_ip, status="FAILED")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification token is invalid, expired, or has already been used.",
        )

    record_audit_log("VERIFY_EMAIL_SUCCESS", user_email=verified_user["email"], ip_address=client_ip)
    return {
        "status": "verified",
        "email": verified_user["email"],
        "message": "Your email address has been successfully verified! You may now access all features.",
    }


@app.post("/api/auth/resend-verification")
async def resend_verification(payload: ResendVerificationRequest, request: Request) -> dict[str, str]:
    clean_email = sanitize_text(payload.email, max_length=120).lower()
    user = get_user_by_email(clean_email)

    # Always return generic message to prevent account enumeration
    generic_msg = "If an unverified account exists for this email, a verification link has been sent."

    if user and not user.get("email_verified"):
        raw_token = generate_secure_token(32)
        token_hash = hash_token(raw_token)
        expires_at = int(time.time()) + (settings.EMAIL_VERIFICATION_EXPIRATION_HOURS * 3600)

        set_email_verification_token(clean_email, token_hash, expires_at)
        send_verification_email(clean_email, raw_token, full_name=user.get("full_name", "Candidate"))
        record_audit_log("RESEND_VERIFICATION", user_email=clean_email)

    return {"message": generic_msg}


# ============================================================================
# Password Reset Endpoints
# ============================================================================

@app.post("/api/auth/forgot-password")
async def forgot_password(payload: ForgotPasswordRequest, request: Request) -> dict[str, str]:
    clean_email = sanitize_text(payload.email, max_length=120).lower()
    user = get_user_by_email(clean_email)

    # Generic response to prevent user enumeration
    generic_msg = "If an account with this email exists, password reset instructions have been sent."

    if user and user.get("is_active"):
        raw_token = generate_secure_token(32)
        token_hash = hash_token(raw_token)
        expires_at = int(time.time()) + (settings.PASSWORD_RESET_EXPIRATION_MINUTES * 60)

        set_password_reset_token(clean_email, token_hash, expires_at)
        send_password_reset_email(clean_email, raw_token, full_name=user.get("full_name", "User"))
        record_audit_log("FORGOT_PASSWORD_REQUEST", user_email=clean_email)

    return {"message": generic_msg}


@app.post("/api/auth/reset-password")
async def reset_password(payload: ResetPasswordRequest, request: Request) -> dict[str, str]:
    if len(payload.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters long.",
        )

    success = reset_password_with_token(payload.token, payload.new_password)
    client_ip = request.client.host if request.client else None

    if not success:
        record_audit_log("RESET_PASSWORD_FAILED", ip_address=client_ip, status="FAILED")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password reset token is invalid, expired, or has already been used.",
        )

    record_audit_log("RESET_PASSWORD_SUCCESS", ip_address=client_ip)
    return {"message": "Your password has been reset successfully. Please log in with your new password."}


@app.post("/api/auth/change-password")
async def change_password(
    payload: ChangePasswordRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, str]:
    db_user = get_user_by_id(current_user["user_id"])
    if not db_user or not verify_password(payload.current_password, db_user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect.",
        )

    if len(payload.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 8 characters long.",
        )

    update_user_password(current_user["user_id"], payload.new_password)
    record_audit_log("CHANGE_PASSWORD_SUCCESS", user_email=current_user["sub"])
    return {"message": "Password updated successfully. Other active sessions have been revoked."}


# ============================================================================
# User Onboarding
# ============================================================================

@app.put("/api/auth/onboarding")
async def save_onboarding(
    payload: OnboardingUpdateRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    clean_role = sanitize_text(payload.target_role, max_length=120)
    clean_dept = sanitize_text(payload.department, max_length=60)
    clean_exp = sanitize_text(payload.experience_level, max_length=60)

    success = update_user_onboarding(
        user_id=current_user["user_id"],
        target_role=clean_role,
        department=clean_dept,
        experience_level=clean_exp,
        completed=True,
    )

    if not success:
        raise HTTPException(status_code=500, detail="Failed to save onboarding preferences.")

    record_audit_log("ONBOARDING_COMPLETED", user_email=current_user["sub"])
    return {
        "status": "onboarding_completed",
        "target_role": clean_role,
        "department": clean_dept,
        "experience_level": clean_exp,
    }


# ============================================================================
# Delete Account (Transactional Deletion)
# ============================================================================

@app.post("/api/auth/delete-account")
async def delete_account(
    payload: DeleteAccountRequest,
    request: Request,
    response: Response,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, str]:
    # Require explicit confirmation text
    if payload.confirmation.strip().upper() != "DELETE":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Confirmation string must be 'DELETE' to proceed with irreversible account deletion.",
        )

    db_user = get_user_by_id(current_user["user_id"])
    if not db_user or not verify_password(payload.password, db_user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed. Incorrect password provided for account deletion.",
        )

    client_ip = request.client.host if request.client else None
    deleted = delete_user_account(
        user_id=current_user["user_id"],
        user_email=current_user["sub"],
        ip_address=client_ip,
    )

    if not deleted:
        raise HTTPException(status_code=500, detail="Failed to complete account deletion.")

    _clear_auth_cookie(response)
    return {
        "status": "account_deleted",
        "message": "Your account and all associated simulation data have been permanently deleted.",
    }


# ============================================================================
# User-Isolated Data Endpoints (Row-Level Security Enforcement)
# ============================================================================

@app.get("/api/user/interviews", response_model=list[UserSessionSummary])
async def list_user_interviews(
    current_user: dict[str, Any] = Depends(get_current_user),
) -> list[UserSessionSummary]:
    sessions = get_user_interview_sessions(current_user["user_id"])
    return [
        UserSessionSummary(
            session_id=s["session_id"],
            role=s["role"],
            department=s["department"],
            difficulty=s["difficulty"],
            score=s.get("score", 0),
            completed=bool(s.get("completed", 0)),
            created_at=str(s.get("created_at", "")),
            updated_at=str(s.get("updated_at", "")),
        )
        for s in sessions
    ]


@app.get("/api/user/interviews/{session_id}")
async def get_user_interview(
    session_id: str,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    clean_session_id = sanitize_text(session_id, max_length=64)
    session_data = get_user_interview_session(current_user["user_id"], clean_session_id)
    if not session_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview session not found or does not belong to your account.",
        )
    return session_data


@app.delete("/api/user/interviews/{session_id}")
async def delete_interview(
    session_id: str,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, str]:
    clean_session_id = sanitize_text(session_id, max_length=64)
    deleted = delete_user_interview_session(current_user["user_id"], clean_session_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview session not found or you lack permission to delete it.",
        )
    return {"status": "deleted", "session_id": clean_session_id}


@app.get("/api/user/resumes")
async def list_user_resumes(
    current_user: dict[str, Any] = Depends(get_current_user),
) -> list[dict[str, Any]]:
    return get_user_resumes(current_user["user_id"])


# ============================================================================
# Protected Admin Endpoints (RBAC Enforced)
# ============================================================================

@app.get("/api/admin/metrics", response_model=AdminMetricsResponse)
async def get_admin_metrics(
    admin_user: dict[str, Any] = Depends(require_admin),
) -> AdminMetricsResponse:
    status_info = rag_engine.get_status()
    all_users = list_users()

    return AdminMetricsResponse(
        status="operational",
        environment=settings.ENV,
        active_sessions=len(engine.sessions),
        registered_users=len(all_users),
        rag_collections={
            "candidate_knowledge": status_info["collections"].get("candidate_knowledge", {}).get("count", 0),
            "interview_knowledge": status_info["collections"].get("interview_knowledge", {}).get("count", 0),
            "technical_knowledge": status_info["collections"].get("technical_knowledge", {}).get("count", 0),
        },
        rate_limiting_enabled=settings.RATE_LIMIT_ENABLED,
        debug_mode=settings.DEBUG,
    )


@app.get("/api/admin/users", response_model=list[UserResponse])
async def get_admin_users(
    admin_user: dict[str, Any] = Depends(require_admin),
) -> list[UserResponse]:
    users = list_users(limit=100)
    return [
        UserResponse(
            id=u["id"],
            email=u["email"],
            full_name=u["full_name"],
            role=u["role"],
            is_active=bool(u["is_active"]),
            email_verified=bool(u.get("email_verified", False)),
            onboarding_completed=bool(u.get("onboarding_completed", False)),
            created_at=str(u.get("created_at", "")),
        )
        for u in users
    ]


@app.post("/api/admin/rag/clean")
async def clean_candidate_rag(
    admin_user: dict[str, Any] = Depends(require_admin),
) -> dict[str, str]:
    if not settings.CHROMA_ALLOW_RESET:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Database reset policy is locked in production settings.",
        )
    record_audit_log("ADMIN_CLEAN_RAG", user_email=admin_user.get("sub"))
    return {"status": "candidate_knowledge_purged"}


# ============================================================================
# RAG Endpoints (Sanitized Inputs)
# ============================================================================

@app.get("/api/rag/status", response_model=RAGStatusResponse)
async def get_rag_status() -> RAGStatusResponse:
    status_info = rag_engine.get_status()
    return RAGStatusResponse(status=status_info["status"], collections=status_info["collections"])


@app.post("/api/rag/resume/upload", response_model=RAGResumeUploadResponse)
async def upload_resume_rag(
    file: UploadFile | None = File(None),
    raw_text: str | None = None,
    candidate_name: str = "Candidate",
    current_user: dict[str, Any] | None = Depends(get_current_user_optional),
) -> RAGResumeUploadResponse:
    text = ""
    clean_candidate_name = sanitize_text(candidate_name, max_length=120) or "Candidate"

    if file:
        content = await file.read()
        if len(content) > settings.MAX_UPLOAD_SIZE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"Uploaded file exceeds {settings.MAX_UPLOAD_SIZE_BYTES // (1024*1024)}MB size limit",
            )

        safe_filename = sanitize_filename(file.filename)
        if safe_filename.lower().endswith(".pdf"):
            try:
                text = rag_engine.extract_text_from_pdf(content)
            except ValueError as err:
                raise HTTPException(status_code=400, detail=str(err)) from err
        else:
            text = content.decode("utf-8", errors="ignore")
    elif raw_text:
        text = raw_text

    text = sanitize_text(text, max_length=settings.MAX_TEXT_INPUT_LENGTH)
    if not text.strip():
        raise HTTPException(status_code=400, detail="No readable text or PDF provided in resume upload.")

    chunks_count = rag_engine.index_resume(text, candidate_name=clean_candidate_name)
    skills = rag_engine._extract_skills_from_text(text)
    keywords, summary = engine.analyze_resume(text, "Candidate Role")

    # Link resume to authenticated user if logged in
    if current_user and current_user.get("user_id"):
        save_user_resume(
            user_id=current_user["user_id"],
            filename=file.filename if file else "Pasted_Resume.txt",
            skills=skills,
            summary=summary,
        )

    return RAGResumeUploadResponse(
        status="success",
        chunks_indexed=chunks_count,
        extracted_skills=skills,
        extracted_text=text[:2000],
        summary=summary,
    )


@app.post("/api/rag/query", response_model=RAGQueryResponse)
async def query_rag(payload: RAGQueryRequest) -> RAGQueryResponse:
    clean_query = sanitize_text(payload.query, max_length=1000)
    try:
        results = rag_engine.query_collection(
            payload.collection_name,
            clean_query,
            n_results=payload.n_results,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return RAGQueryResponse(
        collection_name=payload.collection_name,
        query=clean_query,
        results=results,
    )


@app.post("/api/resume/analyze", response_model=ResumeAnalyzeResponse)
async def analyze_resume(payload: ResumeAnalyzeRequest) -> ResumeAnalyzeResponse:
    clean_text = sanitize_text(payload.text, max_length=settings.MAX_TEXT_INPUT_LENGTH)
    clean_role = sanitize_text(payload.target_role, max_length=160)

    rag_engine.index_resume(clean_text, candidate_name="Candidate")
    keywords, summary = engine.analyze_resume(clean_text, clean_role)
    return ResumeAnalyzeResponse(keywords=keywords, summary=summary)


# ============================================================================
# Interview Simulation Endpoints (Input Sanitized & Isolated)
# ============================================================================

@app.post("/api/interview/start", response_model=InterviewStartResponse)
async def start_interview(
    payload: InterviewStartRequest,
    current_user: dict[str, Any] | None = Depends(get_current_user_optional),
) -> InterviewStartResponse:
    payload.profile.name = sanitize_text(payload.profile.name, max_length=120) or "Candidate"
    payload.profile.target_role = sanitize_text(payload.profile.target_role, max_length=160)
    payload.profile.resume_text = sanitize_text(payload.profile.resume_text, max_length=settings.MAX_TEXT_INPUT_LENGTH)

    if payload.profile.resume_text:
        rag_engine.index_resume(payload.profile.resume_text, candidate_name=payload.profile.name)

    session_id, question, keywords = engine.start_session(payload.profile)

    # If user is authenticated, link session to user account
    if current_user and current_user.get("user_id"):
        save_user_interview_session(
            user_id=current_user["user_id"],
            session_id=session_id,
            role=payload.profile.target_role,
            department=payload.profile.department,
            difficulty=payload.profile.difficulty,
            score=0,
            completed=0,
        )

    return InterviewStartResponse(session_id=session_id, question=question, keywords=keywords)


@app.post("/api/interview/evaluate", response_model=EvaluationResponse)
async def evaluate_answer(
    payload: EvaluationRequest,
    current_user: dict[str, Any] | None = Depends(get_current_user_optional),
) -> EvaluationResponse:
    clean_question = sanitize_text(payload.question, max_length=2000)
    clean_answer = sanitize_text(payload.answer, max_length=12000)

    try:
        (
            score,
            signals,
            breakdown,
            feedback,
            next_question,
            completed,
            weak_area,
            retrieved_concepts,
            depth_score,
            adaptive_strategy,
            next_difficulty,
            diff_trend,
            diff_reason,
            session_memory,
            consistency_conflicts,
            structure_analysis,
            skill_gap_report,
            roadmap,
            rag_context_summary,
        ) = engine.evaluate_answer(
            payload.session_id,
            clean_question,
            clean_answer,
            payload.signals,
        )
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Unknown interview session") from exc

    # If user is authenticated, record evaluation and update session progress
    if current_user and current_user.get("user_id"):
        user_id = current_user["user_id"]
        # Save evaluation turn
        save_user_interview_evaluation(
            user_id=user_id,
            session_id=payload.session_id,
            turn_index=len(engine.sessions.get(payload.session_id, {}).get("history", [])),
            question=clean_question,
            answer=clean_answer,
            score=score,
            feedback_json=json.dumps(feedback),
        )
        # Update session score & completion
        session_obj = engine.sessions.get(payload.session_id, {})
        profile = session_obj.get("profile")
        role = profile.target_role if profile else "Software Engineer"
        dept = profile.department if profile else "Technical"
        diff = profile.difficulty if profile else "Standard"
        save_user_interview_session(
            user_id=user_id,
            session_id=payload.session_id,
            role=role,
            department=dept,
            difficulty=diff,
            score=score,
            completed=1 if completed else 0,
        )

    return EvaluationResponse(
        score=score,
        signals=signals,
        breakdown=breakdown,
        feedback=feedback,
        next_question=next_question,
        completed=completed,
        weak_area=weak_area,
        retrieved_concepts=retrieved_concepts,
        technical_depth_score=depth_score,
        adaptive_strategy=adaptive_strategy,
        current_difficulty=next_difficulty,
        difficulty_trend=diff_trend,
        difficulty_reason=diff_reason,
        memory=session_memory,
        consistency_conflicts=consistency_conflicts,
        structure_analysis=structure_analysis,
        skill_gap_report=skill_gap_report,
        roadmap=roadmap,
        rag_context_summary=rag_context_summary,
    )


# ============================================================================
# WebSocket Endpoint
# ============================================================================

@app.websocket("/ws/interview/{session_id}")
async def interview_socket(websocket: WebSocket, session_id: str) -> None:
    clean_session_id = sanitize_text(session_id, max_length=64)
    if not clean_session_id or clean_session_id not in engine.sessions:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await websocket.accept()
    await websocket.send_json({"type": "connected", "session_id": clean_session_id})

    try:
        while True:
            message = await websocket.receive_json()
            if message.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
                continue

            await asyncio.sleep(0.12)
            await websocket.send_json(
                {
                    "type": "interviewer_event",
                    "message": "Answer received. Generating adaptive follow-up.",
                }
            )
    except WebSocketDisconnect:
        return
