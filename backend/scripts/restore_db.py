"""
MockMate AI - Database Restore & Verification CLI Script
Usage:
  python backend/scripts/restore_db.py --backup /path/to/mockmate_backup.db --target /path/to/restored.db [--confirm]
"""

import argparse
import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parents[1]
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.backup import restore_sqlite_backup


def main():
    parser = argparse.ArgumentParser(description="Restore and verify a database backup for MockMate AI.")
    parser.add_argument("--backup", type=str, required=True, help="Path to the backup database file")
    parser.add_argument("--target", type=str, required=True, help="Destination database path")
    parser.add_argument("--skip-checksum", action="store_true", help="Skip SHA-256 verification (NOT recommended)")
    args = parser.parse_args()

    print(f"[*] Restoring backup from: {args.backup}")
    print(f"[*] Target destination:   {args.target}")

    result = restore_sqlite_backup(
        backup_file=args.backup,
        target_db_file=args.target,
        verify_checksum=not args.skip_checksum,
    )

    if result.get("success"):
        print(f"[+] Database successfully restored and integrity verified:")
        print(f"    Target DB:        {result['target_db']}")
        print(f"    Integrity Status: {result['integrity_status']}")
        sys.exit(0)
    else:
        print(f"[!] Restore failed: {result.get('error')}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
