"""
Database Backup & Disaster Recovery Subsystem
Supports atomic online SQLite backups (via sqlite3 backup API) and PostgreSQL pg_dump.
Generates SHA-256 integrity checksums and enforces automated rotation retention policy.
"""

import datetime
import hashlib
import logging
import os
import shutil
import sqlite3
import subprocess
from pathlib import Path
from typing import Any

from app.config import settings

logger = logging.getLogger("mockmate.backup")

BACKUP_DIR = settings.BACKUP_DIR
BACKUP_DIR.mkdir(parents=True, exist_ok=True)


def calculate_sha256(filepath: Path) -> str:
    """Calculates SHA-256 hash of a file for integrity verification."""
    hasher = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    return hasher.hexdigest()


def create_sqlite_backup(
    source_db_path: Path | str | None = None,
    backup_dir: Path | str | None = None,
    retention_count: int = 7,
) -> dict[str, Any]:
    """
    Performs an atomic, non-blocking online backup of the SQLite database using SQLite's native backup API.
    Does NOT blindly copy file while database may have active write locks.
    """
    from app.user_db import DB_PATH

    source = Path(source_db_path or DB_PATH)
    target_dir = Path(backup_dir or BACKUP_DIR)
    target_dir.mkdir(parents=True, exist_ok=True)

    if not source.exists():
        return {"success": False, "error": f"Source database not found at {source}"}

    timestamp = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%d_%H%M%S")
    backup_filename = f"mockmate_backup_{timestamp}.db"
    backup_path = target_dir / backup_filename
    checksum_path = target_dir / f"{backup_filename}.sha256"

    try:
        # Atomic SQLite online backup
        source_conn = sqlite3.connect(str(source))
        dest_conn = sqlite3.connect(str(backup_path))
        with dest_conn:
            source_conn.backup(dest_conn, pages=100)
        dest_conn.close()
        source_conn.close()

        # Compute and write SHA-256 checksum
        checksum = calculate_sha256(backup_path)
        checksum_path.write_text(f"{checksum}  {backup_filename}\n", encoding="utf-8")

        size_bytes = backup_path.stat().st_size
        logger.info("Database backup created: %s (%d bytes, SHA256: %s)", backup_path.name, size_bytes, checksum[:12])

        # Rotate old backups
        pruned = rotate_backups(target_dir, retention_count=retention_count)

        return {
            "success": True,
            "backup_file": str(backup_path),
            "checksum_file": str(checksum_path),
            "sha256": checksum,
            "size_bytes": size_bytes,
            "timestamp": timestamp,
            "pruned_count": pruned,
        }
    except Exception as exc:
        logger.error("Database backup failed: %s", exc, exc_info=True)
        if backup_path.exists():
            backup_path.unlink()
        if checksum_path.exists():
            checksum_path.unlink()
        return {"success": False, "error": str(exc)}


def restore_sqlite_backup(
    backup_file: Path | str,
    target_db_file: Path | str,
    verify_checksum: bool = True,
) -> dict[str, Any]:
    """
    Restores a database backup to the target destination.
    Validates SHA-256 checksum and executes PRAGMA integrity_check on the restored database.
    """
    backup_path = Path(backup_file)
    target_path = Path(target_db_file)

    if not backup_path.exists():
        return {"success": False, "error": f"Backup file not found: {backup_path}"}

    # Verify SHA-256 checksum if .sha256 file exists
    checksum_path = backup_path.parent / f"{backup_path.name}.sha256"
    if verify_checksum and checksum_path.exists():
        stored_checksum = checksum_path.read_text(encoding="utf-8").split()[0].strip()
        computed_checksum = calculate_sha256(backup_path)
        if stored_checksum.lower() != computed_checksum.lower():
            return {
                "success": False,
                "error": f"Integrity verification failed! Checksum mismatch: expected {stored_checksum}, got {computed_checksum}",
            }

    # Ensure parent dir exists
    target_path.parent.mkdir(parents=True, exist_ok=True)

    try:
        # Atomic restore via SQLite backup API
        source_conn = sqlite3.connect(str(backup_path))
        dest_conn = sqlite3.connect(str(target_path))
        with dest_conn:
            source_conn.backup(dest_conn, pages=100)
        dest_conn.close()
        source_conn.close()

        # Run integrity check on restored database
        check_conn = sqlite3.connect(str(target_path))
        cursor = check_conn.cursor()
        cursor.execute("PRAGMA integrity_check;")
        result = cursor.fetchone()[0]
        check_conn.close()

        if result.lower() != "ok":
            return {"success": False, "error": f"Restored database integrity check failed: {result}"}

        logger.info("Database successfully restored to %s and verified integrity: %s", target_path, result)
        return {
            "success": True,
            "target_db": str(target_path),
            "integrity_status": result,
        }
    except Exception as exc:
        logger.error("Database restore failed: %s", exc, exc_info=True)
        return {"success": False, "error": str(exc)}


def rotate_backups(backup_dir: Path, retention_count: int = 7) -> int:
    """Removes older backups when total count exceeds retention_count."""
    backups = sorted(
        backup_dir.glob("mockmate_backup_*.db"),
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )

    pruned = 0
    if len(backups) > retention_count:
        for old_backup in backups[retention_count:]:
            try:
                old_backup.unlink()
                checksum_file = old_backup.parent / f"{old_backup.name}.sha256"
                if checksum_file.exists():
                    checksum_file.unlink()
                pruned += 1
                logger.info("Rotated out old backup: %s", old_backup.name)
            except Exception as e:
                logger.warning("Could not delete old backup %s: %s", old_backup, e)
    return pruned


def run_pg_backup(output_path: Path | str) -> dict[str, Any]:
    """PostgreSQL pg_dump wrapper for production container environments."""
    pg_db = os.getenv("POSTGRES_DB", "mockmate")
    pg_user = os.getenv("POSTGRES_USER", "mockmate_user")
    pg_host = os.getenv("POSTGRES_HOST", "127.0.0.1")
    pg_port = os.getenv("POSTGRES_PORT", "5432")

    cmd = [
        "pg_dump",
        "-h", pg_host,
        "-p", pg_port,
        "-U", pg_user,
        "-F", "c",
        "-f", str(output_path),
        pg_db,
    ]
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, check=True)
        return {"success": True, "output": proc.stdout}
    except FileNotFoundError:
        return {"success": False, "error": "pg_dump binary not installed on local host"}
    except subprocess.CalledProcessError as e:
        return {"success": False, "error": e.stderr}
