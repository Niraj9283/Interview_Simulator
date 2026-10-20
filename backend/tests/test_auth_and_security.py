"""
MockMate AI - Authentication, Authorization, User Isolation & Security Tests
Tests all Phase 2, 3, 4, 7, 8, 9, 10, 16 backend capabilities.
"""

import os
import sys
import tempfile
import time
import unittest
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).resolve().parents[1]
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from fastapi.testclient import TestClient

import gc
from app.backup import create_sqlite_backup, restore_sqlite_backup
from app.config import settings
from app.main import app as fastapi_app
from app.security import generate_secure_token, hash_token, verify_token_hash
import app.user_db as user_db_module
from app.user_db import (
    authenticate_user,
    create_user,
    delete_user_account,
    delete_user_interview_session,
    get_user_by_email,
    get_user_interview_session,
    get_user_interview_sessions,
    init_database,
    reset_password_with_token,
    revoke_user_sessions,
    save_user_interview_evaluation,
    save_user_interview_session,
    set_email_verification_token,
    set_password_reset_token,
    verify_email_with_token,
)


class TestAuthAndSecurity(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Create an isolated test database
        cls.test_dir = tempfile.TemporaryDirectory()
        cls.test_db_path = Path(cls.test_dir.name) / "test_users.db"
        cls.original_db_path = user_db_module.DB_PATH
        user_db_module.DB_PATH = cls.test_db_path
        init_database(cls.test_db_path)
        cls.client = TestClient(fastapi_app)

    @classmethod
    def tearDownClass(cls):
        user_db_module.DB_PATH = cls.original_db_path
        gc.collect()
        try:
            cls.test_dir.cleanup()
        except Exception:
            pass

    def test_01_registration_and_duplicate_rejection(self):
        email = "alice.test@mockmate.ai"
        res = self.client.post(
            "/api/auth/register",
            json={
                "email": email,
                "full_name": "Alice Candidate",
                "password": "StrongPassword123!",
                "role": "candidate",
            },
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["email"], email)
        self.assertFalse(data["email_verified"])
        self.assertIn("access_token", data)

        # Duplicate registration should return 400
        res_dup = self.client.post(
            "/api/auth/register",
            json={
                "email": email,
                "full_name": "Alice Duplicate",
                "password": "AnotherPassword456!",
                "role": "candidate",
            },
        )
        self.assertEqual(res_dup.status_code, 400)
        self.assertIn("already exists", res_dup.json()["detail"])

    def test_02_email_verification_lifecycle(self):
        email = "bob.verify@mockmate.ai"
        user = create_user(email, "Bob Tester", "Password123!", email_verified=0)
        raw_token = generate_secure_token(32)
        token_hash = hash_token(raw_token)
        expires_at = int(time.time()) + 3600

        set_email_verification_token(email, token_hash, expires_at)

        # 1. Invalid token verification
        bad_res = self.client.post("/api/auth/verify-email", json={"token": "invalid_token_12345"})
        self.assertEqual(bad_res.status_code, 400)

        # 2. Valid token verification
        good_res = self.client.post("/api/auth/verify-email", json={"token": raw_token})
        self.assertEqual(good_res.status_code, 200)
        self.assertEqual(good_res.json()["status"], "verified")

        # 3. Token replay (must be single-use)
        replay_res = self.client.post("/api/auth/verify-email", json={"token": raw_token})
        self.assertEqual(replay_res.status_code, 400)

        # 4. Resend verification returns generic message (prevents enumeration)
        resend_res = self.client.post("/api/auth/resend-verification", json={"email": "nonexistent@mockmate.ai"})
        self.assertEqual(resend_res.status_code, 200)
        self.assertIn("If an unverified account exists", resend_res.json()["message"])

    def test_03_login_and_credential_verification(self):
        email = "charlie@mockmate.ai"
        create_user(email, "Charlie Test", "CorrectPassword123!", email_verified=1)

        # Invalid password
        bad_res = self.client.post("/api/auth/login", json={"email": email, "password": "WrongPassword"})
        self.assertEqual(bad_res.status_code, 401)
        self.assertIn("Invalid email or password", bad_res.json()["detail"])

        # Correct password
        good_res = self.client.post("/api/auth/login", json={"email": email, "password": "CorrectPassword123!"})
        self.assertEqual(good_res.status_code, 200)
        data = good_res.json()
        self.assertEqual(data["email"], email)
        self.assertTrue(data["email_verified"])
        self.assertIn("access_token", data)

        # Verify cookie was set
        self.assertIn("mockmate_token", good_res.cookies)

    def test_04_password_reset_flow(self):
        email = "david.reset@mockmate.ai"
        create_user(email, "David Reset", "OldPassword123!", email_verified=1)

        # 1. Request reset - returns generic success even for unknown emails
        res_unknown = self.client.post("/api/auth/forgot-password", json={"email": "unknown@mockmate.ai"})
        self.assertEqual(res_unknown.status_code, 200)
        self.assertIn("If an account with this email exists", res_unknown.json()["message"])

        # 2. Known user reset request
        res_known = self.client.post("/api/auth/forgot-password", json={"email": email})
        self.assertEqual(res_known.status_code, 200)

        # Retrieve generated token hash from database
        user = get_user_by_email(email)
        token_hash = user["password_reset_token_hash"]
        self.assertIsNotNone(token_hash)

        # 3. Simulate client submitting with raw token
        raw_reset_token = generate_secure_token(32)
        set_password_reset_token(email, hash_token(raw_reset_token), int(time.time()) + 1800)

        # Invalid short password
        short_res = self.client.post("/api/auth/reset-password", json={"token": raw_reset_token, "new_password": "short"})
        self.assertIn(short_res.status_code, (400, 422))

        # Successful password reset
        reset_res = self.client.post(
            "/api/auth/reset-password",
            json={"token": raw_reset_token, "new_password": "NewStrongPassword456!"},
        )
        self.assertEqual(reset_res.status_code, 200)

        # 4. Old password must fail
        self.assertIsNone(authenticate_user(email, "OldPassword123!"))
        # 5. New password must authenticate
        self.assertIsNotNone(authenticate_user(email, "NewStrongPassword456!"))

        # 6. Reused reset token must fail
        reuse_res = self.client.post(
            "/api/auth/reset-password",
            json={"token": raw_reset_token, "new_password": "YetAnotherPassword789!"},
        )
        self.assertEqual(reuse_res.status_code, 400)

    def test_05_user_isolation_and_row_level_security(self):
        # Create User A and User B
        user_a = create_user("usera@mockmate.ai", "User A", "PasswordA123!", email_verified=1)
        user_b = create_user("userb@mockmate.ai", "User B", "PasswordB123!", email_verified=1)

        token_a = self.client.post(
            "/api/auth/login", json={"email": "usera@mockmate.ai", "password": "PasswordA123!"}
        ).json()["access_token"]
        token_b = self.client.post(
            "/api/auth/login", json={"email": "userb@mockmate.ai", "password": "PasswordB123!"}
        ).json()["access_token"]

        # Create session belonging to User A
        session_id_a = "session_user_a_private"
        save_user_interview_session(
            user_id=user_a["id"],
            session_id=session_id_a,
            role="Distributed Systems Architect",
            department="Technical",
            difficulty="Senior",
            score=88,
            completed=1,
        )
        save_user_interview_evaluation(
            user_id=user_a["id"],
            session_id=session_id_a,
            turn_index=1,
            question="Explain Paxos consensus.",
            answer="Paxos is a consensus protocol...",
            score=90,
            feedback_json='["Strong depth"]',
        )

        headers_a = {"Authorization": f"Bearer {token_a}"}
        headers_b = {"Authorization": f"Bearer {token_b}"}

        # User A can access their own session
        res_a = self.client.get(f"/api/user/interviews/{session_id_a}", headers=headers_a)
        self.assertEqual(res_a.status_code, 200)
        self.assertEqual(res_a.json()["session_id"], session_id_a)
        self.assertEqual(len(res_a.json()["evaluations"]), 1)

        # User B CANNOT access User A's session (Row-level isolation test)
        res_b = self.client.get(f"/api/user/interviews/{session_id_a}", headers=headers_b)
        self.assertEqual(res_b.status_code, 404)

        # User B CANNOT delete User A's session
        del_b = self.client.delete(f"/api/user/interviews/{session_id_a}", headers=headers_b)
        self.assertEqual(del_b.status_code, 404)

        # Session must still exist for User A
        check_a = self.client.get(f"/api/user/interviews/{session_id_a}", headers=headers_a)
        self.assertEqual(check_a.status_code, 200)

    def test_06_account_deletion_with_transactional_cleanup(self):
        email = "eve.delete@mockmate.ai"
        user = create_user(email, "Eve Deletion", "PasswordToDelete123!", email_verified=1)
        token = self.client.post(
            "/api/auth/login", json={"email": email, "password": "PasswordToDelete123!"}
        ).json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Create user sessions and evaluations
        session_id = "session_to_be_deleted"
        save_user_interview_session(user["id"], session_id, "DevOps Engineer", "Technical", "Standard", 75, 1)
        save_user_interview_evaluation(user["id"], session_id, 1, "Q?", "A", 75, '["OK"]')

        # 1. Deletion with wrong password fails
        bad_pw_res = self.client.post(
            "/api/auth/delete-account",
            headers=headers,
            json={"password": "WrongPassword", "confirmation": "DELETE"},
        )
        self.assertEqual(bad_pw_res.status_code, 401)

        # 2. Deletion without 'DELETE' confirmation text fails
        bad_conf_res = self.client.post(
            "/api/auth/delete-account",
            headers=headers,
            json={"password": "PasswordToDelete123!", "confirmation": "NO"},
        )
        self.assertEqual(bad_conf_res.status_code, 400)

        # 3. Successful account deletion
        del_res = self.client.post(
            "/api/auth/delete-account",
            headers=headers,
            json={"password": "PasswordToDelete123!", "confirmation": "DELETE"},
        )
        self.assertEqual(del_res.status_code, 200)
        self.assertEqual(del_res.json()["status"], "account_deleted")

        # 4. User record is gone
        self.assertIsNone(get_user_by_email(email))
        # 5. Sessions are cleaned up
        self.assertEqual(len(get_user_interview_sessions(user["id"])), 0)

        # 6. Using the deleted user's token fails immediately
        unauth_res = self.client.get("/api/auth/me", headers=headers)
        self.assertEqual(unauth_res.status_code, 401)

    def test_07_database_backup_and_restore_verification(self):
        backup_dir = Path(self.test_dir.name) / "backups"
        backup_res = create_sqlite_backup(
            source_db_path=self.test_db_path,
            backup_dir=backup_dir,
            retention_count=3,
        )
        self.assertTrue(backup_res["success"])
        backup_file = backup_res["backup_file"]
        checksum_file = backup_res["checksum_file"]
        self.assertTrue(Path(backup_file).exists())
        self.assertTrue(Path(checksum_file).exists())

        # Test restore to a disposable test database path
        disposable_restore_path = Path(self.test_dir.name) / "restored_disposable.db"
        restore_res = restore_sqlite_backup(
            backup_file=backup_file,
            target_db_file=disposable_restore_path,
            verify_checksum=True,
        )
        self.assertTrue(restore_res["success"])
        self.assertEqual(restore_res["integrity_status"], "ok")
        self.assertTrue(disposable_restore_path.exists())


if __name__ == "__main__":
    unittest.main()
