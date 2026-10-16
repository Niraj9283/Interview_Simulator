"""
Secure Database Subsystem
SQLite engine using parameterized queries exclusively (zero SQL-injection vulnerability).
Manages authenticated users, roles, and audit access logs.
"""

import sqlite3
from pathlib import Path
from typing import Any
from app.config import settings
from app.security import hash_password, verify_password

DB_PATH = Path(__file__).resolve().parents[1] / "data" / "mockmate_users.db"
DB_PATH.parent.mkdir(parents=True, exist_ok=True)


def get_db_connection() -> sqlite3.Connection:
    """Returns a SQLite connection with row factory enabled."""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def init_database() -> None:
    """Initializes the database schema and seeds the default admin user securely."""
    with get_db_connection() as conn:
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
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

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

        # Ensure default admin exists
        cursor.execute("SELECT id FROM users WHERE email = ?", ("admin@mockmate.ai",))
        if not cursor.fetchone():
            default_admin_password = os_env_admin_pw = settings.ADMIN_API_KEY
            hashed = hash_password(default_admin_password)
            cursor.execute(
                """
                INSERT INTO users (email, full_name, hashed_password, role, is_active)
                VALUES (?, ?, ?, ?, ?)
                """,
                ("admin@mockmate.ai", "System Administrator", hashed, "admin", 1),
            )
            conn.commit()


def create_user(email: str, full_name: str, password: str, role: str = "candidate") -> dict[str, Any]:
    """Creates a new user with securely hashed password using parameterized queries."""
    clean_email = email.strip().lower()
    hashed = hash_password(password)

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO users (email, full_name, hashed_password, role, is_active)
            VALUES (?, ?, ?, ?, 1)
            """,
            (clean_email, full_name.strip(), hashed, role),
        )
        conn.commit()
        user_id = cursor.lastrowid

    return {
        "id": user_id,
        "email": clean_email,
        "full_name": full_name.strip(),
        "role": role,
    }


def get_user_by_email(email: str) -> dict[str, Any] | None:
    """Retrieves user by email using parameterized query."""
    clean_email = email.strip().lower()
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, email, full_name, hashed_password, role, is_active, created_at FROM users WHERE email = ?",
            (clean_email,),
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
        }
    return None


def list_users(limit: int = 50) -> list[dict[str, Any]]:
    """Lists users (excluding password hashes) for admin oversight."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, email, full_name, role, is_active, created_at FROM users ORDER BY id DESC LIMIT ?",
            (limit,),
        )
        return [dict(row) for row in cursor.fetchall()]


def record_audit_log(action: str, user_email: str | None = None, ip_address: str | None = None, status: str = "SUCCESS") -> None:
    """Records an administrative audit event."""
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
