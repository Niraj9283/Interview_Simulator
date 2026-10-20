"""
Secure Database Subsystem with User Isolation & Migrations
SQLite engine using parameterized queries exclusively (zero SQL-injection vulnerability).
Enforces foreign keys, cascade deletes, data isolation per user, and audit access logs.
"""

import json
import os
import sqlite3
import time
from pathlib import Path
from typing import Any

from app.config import settings
from app.security import hash_password, hash_token, verify_password, verify_token_hash

DB_PATH = Path(__file__).resolve().parents[1] / "data" / "mockmate_users.db"
DB_PATH.parent.mkdir(parents=True, exist_ok=True)


from contextlib import contextmanager

@contextmanager
def get_db_connection(db_file: Path | str | None = None):
    """Yields a SQLite connection with foreign keys and row factory enabled, closing it upon exit."""
    target_path = str(db_file or DB_PATH)
    conn = sqlite3.connect(target_path)
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


def _run_migrations(conn: sqlite3.Connection) -> None:
    """Safely upgrades table schema with backwards compatibility for existing columns."""
    cursor = conn.cursor()
    cursor.execute("PRAGMA table_info(users)")
    existing_cols = {row["name"] for row in cursor.fetchall()}

    columns_to_add = [
        ("email_verified", "INTEGER DEFAULT 0"),
        ("email_verification_token_hash", "TEXT"),
        ("email_verification_expires_at", "INTEGER"),
        ("email_verification_sent_at", "INTEGER"),
        ("password_reset_token_hash", "TEXT"),
        ("password_reset_expires_at", "INTEGER"),
        ("onboarding_completed", "INTEGER DEFAULT 0"),
        ("target_role", "TEXT"),
        ("experience_level", "TEXT"),
        ("department", "TEXT"),
        ("token_version", "INTEGER DEFAULT 1"),
    ]

    for col_name, col_def in columns_to_add:
        if col_name not in existing_cols:
            cursor.execute(f"ALTER TABLE users ADD COLUMN {col_name} {col_def}")


def init_database(db_file: Path | str | None = None) -> None:
    """Initializes the database schema and seeds the default admin user securely."""
    with get_db_connection(db_file) as conn:
        cursor = conn.cursor()

        # Users table with strict constraints
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                full_name TEXT NOT NULL,
                hashed_password TEXT NOT NULL,
                role TEXT NOT NULL CHECK(role IN ('admin', 'interviewer', 'candidate')),
                is_active INTEGER DEFAULT 1,
                email_verified INTEGER DEFAULT 0,
                email_verification_token_hash TEXT,
                email_verification_expires_at INTEGER,
                email_verification_sent_at INTEGER,
                password_reset_token_hash TEXT,
                password_reset_expires_at INTEGER,
                onboarding_completed INTEGER DEFAULT 0,
                target_role TEXT,
                experience_level TEXT,
                department TEXT,
                token_version INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Execute column additions if database existed previously
        _run_migrations(conn)

        # Audit logs table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS audit_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_email TEXT,
                action TEXT NOT NULL,
                ip_address TEXT,
                status TEXT NOT NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # User Interview Sessions (Row-level isolation)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_interview_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                session_id TEXT UNIQUE NOT NULL,
                role TEXT NOT NULL,
                department TEXT NOT NULL,
                difficulty TEXT NOT NULL,
                score INTEGER DEFAULT 0,
                completed INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # User Interview Evaluations
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_interview_evaluations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                session_id TEXT NOT NULL,
                turn_index INTEGER NOT NULL,
                question TEXT NOT NULL,
                answer TEXT NOT NULL,
                score INTEGER NOT NULL,
                feedback_json TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # User Resumes
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_resumes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                filename TEXT NOT NULL,
                extracted_skills TEXT,
                summary TEXT,
                uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # User Preferences / Settings
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_settings (
                user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
                preferences_json TEXT NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Indexes for fast and isolated queries
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_interview_sessions(user_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_user_evals_user ON user_interview_evaluations(user_id, session_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_user_resumes_user ON user_resumes(user_id);")

        # Ensure default admin exists
        cursor.execute("SELECT id FROM users WHERE email = ?", ("admin@mockmate.ai",))
        if not cursor.fetchone():
            default_admin_password = settings.ADMIN_API_KEY
            hashed = hash_password(default_admin_password)
            cursor.execute(
                """
                INSERT INTO users (email, full_name, hashed_password, role, is_active, email_verified, onboarding_completed)
                VALUES (?, ?, ?, ?, ?, 1, 1)
                """,
                ("admin@mockmate.ai", "System Administrator", hashed, "admin", 1),
            )
            conn.commit()


# ============================================================================
# User Registration, Authentication & Profile
# ============================================================================

def create_user(
    email: str,
    full_name: str,
    password: str,
    role: str = "candidate",
    email_verified: int = 0,
    verification_token_hash: str | None = None,
    verification_expires_at: int | None = None,
) -> dict[str, Any]:
    """Creates a new user with securely hashed password using parameterized queries."""
    clean_email = email.strip().lower()
    hashed = hash_password(password)
    now = int(time.time())

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO users (
                email, full_name, hashed_password, role, is_active,
                email_verified, email_verification_token_hash,
                email_verification_expires_at, email_verification_sent_at,
                token_version
            )
            VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, 1)
            """,
            (
                clean_email,
                full_name.strip(),
                hashed,
                role,
                email_verified,
                verification_token_hash,
                verification_expires_at,
                now if verification_token_hash else None,
            ),
        )
        conn.commit()
        user_id = cursor.lastrowid

    return {
        "id": user_id,
        "email": clean_email,
        "full_name": full_name.strip(),
        "role": role,
        "email_verified": bool(email_verified),
        "onboarding_completed": False,
    }


def get_user_by_email(email: str) -> dict[str, Any] | None:
    """Retrieves user by email using parameterized query."""
    clean_email = email.strip().lower()
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT id, email, full_name, hashed_password, role, is_active,
                   email_verified, email_verification_token_hash, email_verification_expires_at,
                   password_reset_token_hash, password_reset_expires_at,
                   onboarding_completed, target_role, experience_level, department,
                   token_version, created_at
            FROM users WHERE email = ?
            """,
            (clean_email,),
        )
        row = cursor.fetchone()
        return dict(row) if row else None


def get_user_by_id(user_id: int) -> dict[str, Any] | None:
    """Retrieves user by ID using parameterized query."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT id, email, full_name, hashed_password, role, is_active,
                   email_verified, email_verification_token_hash, email_verification_expires_at,
                   password_reset_token_hash, password_reset_expires_at,
                   onboarding_completed, target_role, experience_level, department,
                   token_version, created_at
            FROM users WHERE id = ?
            """,
            (user_id,),
        )
        row = cursor.fetchone()
        return dict(row) if row else None


def authenticate_user(email: str, password: str) -> dict[str, Any] | None:
    """Authenticates credentials against stored hash."""
    user = get_user_by_email(email)
    if not user or not user["is_active"]:
        return None
    if verify_password(password, user["hashed_password"]):
        return {
            "id": user["id"],
            "email": user["email"],
            "full_name": user["full_name"],
            "role": user["role"],
            "email_verified": bool(user.get("email_verified", 0)),
            "onboarding_completed": bool(user.get("onboarding_completed", 0)),
            "token_version": user.get("token_version", 1),
        }
    return None


# ============================================================================
# Email Verification Subsystem
# ============================================================================

def set_email_verification_token(email: str, token_hash: str, expires_at: int) -> bool:
    """Sets a new verification token hash and expiration timestamp for user."""
    clean_email = email.strip().lower()
    now = int(time.time())
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            UPDATE users
            SET email_verification_token_hash = ?,
                email_verification_expires_at = ?,
                email_verification_sent_at = ?
            WHERE email = ?
            """,
            (token_hash, expires_at, now, clean_email),
        )
        conn.commit()
        return cursor.rowcount > 0


def verify_email_with_token(raw_token: str) -> dict[str, Any] | None:
    """
    Validates email verification token against stored hash, ensuring it is unexpired and single-use.
    Marks email_verified = 1 and clears the token hash.
    """
    now = int(time.time())
    computed_hash = hash_token(raw_token)

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT id, email, full_name, role, email_verification_expires_at
            FROM users
            WHERE email_verification_token_hash = ?
            """,
            (computed_hash,),
        )
        row = cursor.fetchone()
        if not row:
            return None

        user = dict(row)
        expires_at = user.get("email_verification_expires_at") or 0
        if expires_at < now:
            return None

        # Mark as verified and invalidate token (single-use)
        cursor.execute(
            """
            UPDATE users
            SET email_verified = 1,
                email_verification_token_hash = NULL,
                email_verification_expires_at = NULL
            WHERE id = ?
            """,
            (user["id"],),
        )
        conn.commit()
        user["email_verified"] = True
        return user


# ============================================================================
# Password Reset Subsystem
# ============================================================================

def set_password_reset_token(email: str, token_hash: str, expires_at: int) -> bool:
    """Sets a new password reset token hash and expiration."""
    clean_email = email.strip().lower()
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            UPDATE users
            SET password_reset_token_hash = ?,
                password_reset_expires_at = ?
            WHERE email = ? AND is_active = 1
            """,
            (token_hash, expires_at, clean_email),
        )
        conn.commit()
        return cursor.rowcount > 0


def reset_password_with_token(raw_token: str, new_password: str) -> bool:
    """
    Validates reset token, updates password hash, invalidates reset token,
    and increments token_version to immediately revoke all existing sessions.
    """
    now = int(time.time())
    computed_hash = hash_token(raw_token)
    new_hashed = hash_password(new_password)

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT id, password_reset_expires_at, token_version
            FROM users
            WHERE password_reset_token_hash = ? AND is_active = 1
            """,
            (computed_hash,),
        )
        row = cursor.fetchone()
        if not row:
            return False

        user = dict(row)
        if (user.get("password_reset_expires_at") or 0) < now:
            return False

        # Invalidate reset token and increment token_version for global session revocation
        new_version = (user.get("token_version") or 1) + 1
        cursor.execute(
            """
            UPDATE users
            SET hashed_password = ?,
                password_reset_token_hash = NULL,
                password_reset_expires_at = NULL,
                token_version = ?
            WHERE id = ?
            """,
            (new_hashed, new_version, user["id"]),
        )
        conn.commit()
        return True


def update_user_password(user_id: int, new_password: str) -> bool:
    """Updates password and revokes existing sessions for an authenticated user."""
    new_hashed = hash_password(new_password)
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            UPDATE users
            SET hashed_password = ?,
                token_version = token_version + 1
            WHERE id = ?
            """,
            (new_hashed, user_id),
        )
        conn.commit()
        return cursor.rowcount > 0


# ============================================================================
# Session Revocation & Onboarding Updates
# ============================================================================

def revoke_user_sessions(user_id: int) -> bool:
    """Increments token version to immediately invalidate all existing access tokens."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE users SET token_version = token_version + 1 WHERE id = ?", (user_id,))
        conn.commit()
        return cursor.rowcount > 0


def update_user_onboarding(
    user_id: int,
    target_role: str,
    department: str,
    experience_level: str,
    completed: bool = True,
) -> bool:
    """Persists user onboarding choices and sets onboarding_completed flag."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            UPDATE users
            SET target_role = ?,
                department = ?,
                experience_level = ?,
                onboarding_completed = ?
            WHERE id = ?
            """,
            (target_role.strip(), department.strip(), experience_level.strip(), 1 if completed else 0, user_id),
        )
        conn.commit()
        return cursor.rowcount > 0


# ============================================================================
# Account Deletion (Complete Transactional Cleanup)
# ============================================================================

def delete_user_account(user_id: int, user_email: str, ip_address: str | None = None) -> bool:
    """
    Transactionally deletes all user records (interviews, answers, scores, resumes, settings)
    and removes the user row, while logging a minimal audit event.
    """
    with get_db_connection() as conn:
        cursor = conn.cursor()
        # 1. Delete associated data
        cursor.execute("DELETE FROM user_interview_evaluations WHERE user_id = ?", (user_id,))
        cursor.execute("DELETE FROM user_interview_sessions WHERE user_id = ?", (user_id,))
        cursor.execute("DELETE FROM user_resumes WHERE user_id = ?", (user_id,))
        cursor.execute("DELETE FROM user_settings WHERE user_id = ?", (user_id,))

        # 2. Delete user account
        cursor.execute("DELETE FROM users WHERE id = ?", (user_id,))
        deleted = cursor.rowcount > 0

        # 3. Record minimal audit trail
        cursor.execute(
            """
            INSERT INTO audit_logs (user_email, action, ip_address, status)
            VALUES (?, 'DELETE_ACCOUNT', ?, 'SUCCESS')
            """,
            (user_email, ip_address),
        )
        conn.commit()
        return deleted


# ============================================================================
# User-Isolated Data Management (Row-Level Security Enforcement)
# ============================================================================

def save_user_interview_session(
    user_id: int,
    session_id: str,
    role: str,
    department: str,
    difficulty: str,
    score: int = 0,
    completed: int = 0,
) -> dict[str, Any]:
    """Records an interview session linked explicitly to user_id."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO user_interview_sessions (
                user_id, session_id, role, department, difficulty, score, completed
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(session_id) DO UPDATE SET
                score = excluded.score,
                completed = excluded.completed,
                updated_at = CURRENT_TIMESTAMP
            """,
            (user_id, session_id, role, department, difficulty, score, completed),
        )
        conn.commit()
    return {
        "session_id": session_id,
        "user_id": user_id,
        "score": score,
        "completed": bool(completed),
    }


def save_user_interview_evaluation(
    user_id: int,
    session_id: str,
    turn_index: int,
    question: str,
    answer: str,
    score: int,
    feedback_json: str,
) -> None:
    """Records an interview answer evaluation linked to user_id."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO user_interview_evaluations (
                user_id, session_id, turn_index, question, answer, score, feedback_json
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (user_id, session_id, turn_index, question, answer, score, feedback_json),
        )
        conn.commit()


def get_user_interview_sessions(user_id: int, limit: int = 50) -> list[dict[str, Any]]:
    """Returns ONLY the interview sessions belonging to the requesting user."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT session_id, role, department, difficulty, score, completed, created_at, updated_at
            FROM user_interview_sessions
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT ?
            """,
            (user_id, limit),
        )
        return [dict(row) for row in cursor.fetchall()]


def get_user_interview_session(user_id: int, session_id: str) -> dict[str, Any] | None:
    """Returns a specific interview session ONLY if owned by the user."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT session_id, role, department, difficulty, score, completed, created_at, updated_at
            FROM user_interview_sessions
            WHERE user_id = ? AND session_id = ?
            """,
            (user_id, session_id),
        )
        row = cursor.fetchone()
        if not row:
            return None
        session_data = dict(row)

        # Retrieve evaluations for this session
        cursor.execute(
            """
            SELECT turn_index, question, answer, score, feedback_json, created_at
            FROM user_interview_evaluations
            WHERE user_id = ? AND session_id = ?
            ORDER BY turn_index ASC
            """,
            (user_id, session_id),
        )
        evals = []
        for r in cursor.fetchall():
            d = dict(r)
            try:
                d["feedback"] = json.loads(d["feedback_json"])
            except Exception:
                d["feedback"] = []
            evals.append(d)
        session_data["evaluations"] = evals
        return session_data


def delete_user_interview_session(user_id: int, session_id: str) -> bool:
    """Deletes an interview session ONLY if owned by the user."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "DELETE FROM user_interview_evaluations WHERE user_id = ? AND session_id = ?",
            (user_id, session_id),
        )
        cursor.execute(
            "DELETE FROM user_interview_sessions WHERE user_id = ? AND session_id = ?",
            (user_id, session_id),
        )
        conn.commit()
        return cursor.rowcount > 0


def save_user_resume(
    user_id: int,
    filename: str,
    skills: list[str],
    summary: str,
) -> dict[str, Any]:
    """Records uploaded resume metadata linked to user."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO user_resumes (user_id, filename, extracted_skills, summary)
            VALUES (?, ?, ?, ?)
            """,
            (user_id, filename, json.dumps(skills), summary),
        )
        conn.commit()
        resume_id = cursor.lastrowid
    return {
        "id": resume_id,
        "filename": filename,
        "skills": skills,
        "summary": summary,
    }


def get_user_resumes(user_id: int) -> list[dict[str, Any]]:
    """Returns resumes owned by the user."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT id, filename, extracted_skills, summary, uploaded_at
            FROM user_resumes
            WHERE user_id = ?
            ORDER BY uploaded_at DESC
            """,
            (user_id),
        )
        rows = []
        for r in cursor.fetchall():
            d = dict(r)
            try:
                d["extracted_skills"] = json.loads(d["extracted_skills"])
            except Exception:
                d["extracted_skills"] = []
            rows.append(d)
        return rows


def list_users(limit: int = 50) -> list[dict[str, Any]]:
    """Lists users (excluding password hashes) for admin oversight."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT id, email, full_name, role, is_active, email_verified,
                   onboarding_completed, created_at
            FROM users ORDER BY id DESC LIMIT ?
            """,
            (limit,),
        )
        return [dict(row) for row in cursor.fetchall()]


def record_audit_log(
    action: str,
    user_email: str | None = None,
    ip_address: str | None = None,
    status: str = "SUCCESS",
) -> None:
    """Records an administrative or security audit event."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO audit_logs (user_email, action, ip_address, status)
            VALUES (?, ?, ?, ?)
            """,
            (user_email, action, ip_address, status),
        )
        conn.commit()
