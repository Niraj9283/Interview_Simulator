"""
MockMate AI - Database Backup CLI Script
Usage:
  python backend/scripts/backup_db.py [--retention 7] [--dir /path/to/backups]
"""

import argparse
import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parents[1]
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.backup import create_sqlite_backup


def main():
    parser = argparse.ArgumentParser(description="Create a verified atomic database backup for MockMate AI.")
    parser.add_argument("--retention", type=int, default=7, help="Number of daily backups to retain (default: 7)")
    parser.add_argument("--dir", type=str, default=None, help="Directory to store backups")
    args = parser.parse_args()

    print("[*] Initiating atomic database backup...")
    result = create_sqlite_backup(backup_dir=args.dir, retention_count=args.retention)

    if result.get("success"):
        print(f"[+] Backup successfully created:")
        print(f"    File:     {result['backup_file']}")
        print(f"    Size:     {result['size_bytes']} bytes")
        print(f"    SHA-256:  {result['sha256']}")
        print(f"    Checksum: {result['checksum_file']}")
        print(f"    Pruned:   {result['pruned_count']} old backup(s)")
        sys.exit(0)
    else:
        print(f"[!] Backup failed: {result.get('error')}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
