"""
Email Delivery Service (Verification, Password Reset, Feedback)
Supports Resend API and graceful development simulation fallback.
"""

import json
import logging
import urllib.request
import urllib.error
from typing import Any

from app.config import settings

logger = logging.getLogger("mockmate.email")


def _send_via_resend(to_email: str, subject: str, html_content: str, text_content: str) -> dict[str, Any]:
    """Dispatches email via Resend REST API."""
    url = "https://api.resend.com/emails"
    headers = {
        "Authorization": f"Bearer {settings.RESEND_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "from": settings.EMAIL_FROM,
        "to": [to_email],
        "subject": subject,
        "html": html_content,
        "text": text_content,
    }

    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers=headers,
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            logger.info("Resend email dispatched successfully to %s, id: %s", to_email, data.get("id"))
            return {"success": True, "id": data.get("id"), "simulated": False}
    except urllib.error.HTTPError as err:
        err_body = err.read().decode("utf-8", errors="ignore")
        logger.error("Resend API failed with status %d: %s", err.code, err_body)
        return {"success": False, "error": f"Resend API error ({err.code})", "detail": err_body}
    except Exception as exc:
        logger.error("Failed to connect to email provider: %s", exc)
        return {"success": False, "error": str(exc)}


def send_verification_email(to_email: str, raw_token: str, full_name: str = "Candidate") -> dict[str, Any]:
    """Constructs and sends an email verification link."""
    verify_url = f"{settings.APP_URL}/verify-email?token={raw_token}"
    subject = "Verify your email address - MockMate AI"

    text_content = (
        f"Hello {full_name},\n\n"
        f"Thank you for registering for MockMate AI. Please verify your email address by opening the following link:\n\n"
        f"{verify_url}\n\n"
        f"This link will expire in {settings.EMAIL_VERIFICATION_EXPIRATION_HOURS} hours.\n"
        f"If you did not create a MockMate AI account, please disregard this email."
    )

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0c0c0c; color: #f5f5f5; padding: 32px 16px; margin: 0;">
      <div style="max-width: 560px; margin: 0 auto; background-color: #141414; border: 1px solid #222222; border-radius: 16px; padding: 32px;">
        <div style="margin-bottom: 24px; font-weight: bold; font-size: 20px; color: #ffffff;">
          MockMate<span style="color: #FF4D3D;">.AI</span>
        </div>
        <h2 style="margin: 0 0 16px; color: #ffffff; font-size: 20px;">Verify your email address</h2>
        <p style="color: #a0a0a0; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
          Hi {full_name}, thank you for registering with MockMate AI. Confirm your email address to access realistic mock interviews, real-time vocal feedback, and resume-tailored questions.
        </p>
        <div style="margin-bottom: 28px;">
          <a href="{verify_url}" style="display: inline-block; background-color: #FF4D3D; color: #0c0c0c; font-weight: bold; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-size: 14px;">
            Verify Email Address
          </a>
        </div>
        <p style="color: #666666; font-size: 12px; line-height: 1.5; margin: 0 0 8px;">
          Or copy and paste this verification URL into your browser:
        </p>
        <p style="color: #888888; font-size: 12px; word-break: break-all; margin: 0 0 24px;">
          {verify_url}
        </p>
        <p style="color: #555555; font-size: 11px; margin: 0;">
          This link expires in {settings.EMAIL_VERIFICATION_EXPIRATION_HOURS} hours. If you did not create an account, you can safely ignore this email.
        </p>
      </div>
    </body>
    </html>
    """

    if settings.RESEND_API_KEY and not settings.RESEND_API_KEY.startswith("re_your_"):
        return _send_via_resend(to_email, subject, html_content, text_content)

    # Local development & test fallback
    logger.info("[SIMULATED EMAIL] Verification email to %s -> %s", to_email, verify_url)
    return {
        "success": True,
        "simulated": True,
        "verification_url": verify_url,
        "message": "Verification link generated (development simulation active)",
    }


def send_password_reset_email(to_email: str, raw_token: str, full_name: str = "User") -> dict[str, Any]:
    """Constructs and sends a password reset link."""
    reset_url = f"{settings.APP_URL}/reset-password?token={raw_token}"
    subject = "Reset your password - MockMate AI"

    text_content = (
        f"Hello {full_name},\n\n"
        f"A password reset request was received for your MockMate AI account. You can set a new password by visiting:\n\n"
        f"{reset_url}\n\n"
        f"This link will expire in {settings.PASSWORD_RESET_EXPIRATION_MINUTES} minutes and can only be used once.\n"
        f"If you did not request this reset, your account is safe and no action is required."
    )

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0c0c0c; color: #f5f5f5; padding: 32px 16px; margin: 0;">
      <div style="max-width: 560px; margin: 0 auto; background-color: #141414; border: 1px solid #222222; border-radius: 16px; padding: 32px;">
        <div style="margin-bottom: 24px; font-weight: bold; font-size: 20px; color: #ffffff;">
          MockMate<span style="color: #FF4D3D;">.AI</span>
        </div>
        <h2 style="margin: 0 0 16px; color: #ffffff; font-size: 20px;">Password Reset Request</h2>
        <p style="color: #a0a0a0; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
          Hi {full_name}, we received a request to reset your password. Click the button below to choose a new password:
        </p>
        <div style="margin-bottom: 28px;">
          <a href="{reset_url}" style="display: inline-block; background-color: #FF4D3D; color: #0c0c0c; font-weight: bold; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-size: 14px;">
            Reset Password
          </a>
        </div>
        <p style="color: #666666; font-size: 12px; line-height: 1.5; margin: 0 0 8px;">
          Or copy and paste this reset URL into your browser:
        </p>
        <p style="color: #888888; font-size: 12px; word-break: break-all; margin: 0 0 24px;">
          {reset_url}
        </p>
        <p style="color: #555555; font-size: 11px; margin: 0;">
          This link will expire in {settings.PASSWORD_RESET_EXPIRATION_MINUTES} minutes and can only be used once. If you did not request a reset, you can safely ignore this email.
        </p>
      </div>
    </body>
    </html>
    """

    if settings.RESEND_API_KEY and not settings.RESEND_API_KEY.startswith("re_your_"):
        return _send_via_resend(to_email, subject, html_content, text_content)

    logger.info("[SIMULATED EMAIL] Password reset email to %s -> %s", to_email, reset_url)
    return {
        "success": True,
        "simulated": True,
        "reset_url": reset_url,
        "message": "Reset link generated (development simulation active)",
    }
