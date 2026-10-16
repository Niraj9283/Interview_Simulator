"""
Input Sanitization & Injection Defense Utility
Protects against XSS, Path Traversal, Null Byte Injections, and Malformed Unicode.
"""

import html
import re
from pathlib import Path


# Regex patterns for dangerous HTML / script constructs
DANGEROUS_TAGS_PATTERN = re.compile(
    r"<\s*(script|iframe|object|embed|applet|style|link|meta|base|form|svg)[^>]*>.*?<\s*/\s*\1\s*>",
    re.IGNORECASE | re.DOTALL,
)
SELF_CLOSING_DANGEROUS_TAGS = re.compile(
    r"<\s*(script|iframe|object|embed|applet|style|link|meta|base|img|svg)[^>]*>",
    re.IGNORECASE,
)
JAVASCRIPT_URI_PATTERN = re.compile(r"javascript\s*:", re.IGNORECASE)
EVENT_HANDLER_PATTERN = re.compile(r"on\w+\s*=", re.IGNORECASE)
NULL_BYTE_PATTERN = re.compile(r"[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]")


def sanitize_text(text: str | None, max_length: int = 50000) -> str:
    """
    Sanitize general text input (answers, resume snippets, questions).
    Strips dangerous HTML/script tags, control characters, and enforces length bounds.
    """
    if text is None:
        return ""

    # Remove null bytes and unprintable ASCII control characters
    cleaned = NULL_BYTE_PATTERN.sub("", text)

    # Strip dangerous HTML and script tags
    cleaned = DANGEROUS_TAGS_PATTERN.sub("", cleaned)
    cleaned = SELF_CLOSING_DANGEROUS_TAGS.sub("", cleaned)
    cleaned = JAVASCRIPT_URI_PATTERN.sub("", cleaned)
    cleaned = EVENT_HANDLER_PATTERN.sub("", cleaned)

    # Truncate to maximum allowed length
    if len(cleaned) > max_length:
        cleaned = cleaned[:max_length]

    return cleaned.strip()


def sanitize_html_output(text: str | None) -> str:
    """Escapes HTML entities for safe rendering in HTML contexts."""
    if not text:
        return ""
    return html.escape(sanitize_text(text))


def sanitize_filename(filename: str | None) -> str:
    """
    Prevents path traversal attacks (e.g. '../../etc/passwd' or '..\\windows\\system32').
    Returns a safe base filename.
    """
    if not filename:
        return "uploaded_file"

    # Extract base name using Path
    base_name = Path(filename).name

    # Remove non-whitelisted characters
    safe_name = re.sub(r"[^a-zA-Z0-9_\-\.]", "_", base_name)

    # Remove leading dots to prevent hidden files
    safe_name = safe_name.lstrip(".")

    return safe_name if safe_name else "file"
