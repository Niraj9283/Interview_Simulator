"""Run against a real PostgreSQL database in a disposable, isolated schema.
Set TEST_DATABASE_URL; email delivery is mocked and public tables are untouched.
"""
import os
import sys
import unittest
import uuid
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

@unittest.skipUnless(os.getenv('TEST_DATABASE_URL'), 'TEST_DATABASE_URL is not configured')
class PostgresAuthTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        import psycopg
        from psycopg import sql
        from app.config import settings
        import app.postgres as pg
        from app.user_db import init_database
        from app.main import app
        from fastapi.testclient import TestClient
        cls.schema = 'test_auth_' + uuid.uuid4().hex
        cls.url = os.environ['TEST_DATABASE_URL']
        cls.admin = psycopg.connect(cls.url, autocommit=True)
        cls.addClassCleanup(cls.admin.close)
        cls.admin.execute(sql.SQL('CREATE SCHEMA {}').format(sql.Identifier(cls.schema)))
        cls.addClassCleanup(lambda: cls.admin.execute(sql.SQL('DROP SCHEMA {} CASCADE').format(sql.Identifier(cls.schema))))
        original_connect = pg.connect
        def isolated_connect(url):
            conn = original_connect(url)
            # This identifier is generated locally, never taken from input.
            conn.execute(f'SET search_path TO {cls.schema}')
            return conn
        cls.patches = [patch.object(settings, 'DATABASE_URL', cls.url),
                       patch.object(pg, 'connect', isolated_connect),
                       patch('app.main.send_verification_email'),
                       patch('app.main.send_password_reset_email')]
        for item in cls.patches:
            item.start()
            cls.addClassCleanup(item.stop)
        init_database()
        init_database()  # Existing schema/admin path must also commit cleanly.
        cls.client = TestClient(app)
        cls.addClassCleanup(cls.client.close)

    def test_registration_login_session_and_wrong_password(self):
        payload = {'email': 'pg-test@example.invalid', 'full_name': 'Postgres Test',
                   'password': 'Valid-test-password-4!', 'role': 'candidate'}
        response = self.client.post('/api/auth/register', json=payload)
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(self.client.get('/api/auth/me').status_code, 200)
        duplicate = self.client.post('/api/auth/register', json=payload)
        self.assertEqual(duplicate.status_code, 400)
        self.assertEqual(self.client.post('/api/auth/logout').status_code, 200)
        wrong = self.client.post('/api/auth/login', json={'email': payload['email'], 'password': 'Wrong-password-4!'})
        self.assertEqual(wrong.status_code, 401)
        self.client.cookies.clear()
        login = self.client.post('/api/auth/login', json={'email': payload['email'], 'password': payload['password']})
        self.assertEqual(login.status_code, 200, login.text)
        profile = self.client.get('/api/auth/me')
        self.assertEqual(profile.status_code, 200, profile.text)
        self.assertEqual(profile.json()['email'], payload['email'])

    def test_records_persist_across_connections_and_remain_isolated(self):
        from app import user_db as db
        user = db.create_user('owner@example.invalid', "Owner's ? % Profile", 'Strong-password-7!')
        other = db.create_user('other@example.invalid', 'Other User', 'Strong-password-8!')
        self.assertEqual(db.get_user_by_id(user['id'])['full_name'], "Owner's ? % Profile")
        db.save_user_interview_session(user['id'], 'pg-session', 'Engineer', 'Engineering', 'medium')
        db.save_user_interview_session(user['id'], 'pg-session', 'Engineer', 'Engineering', 'medium', score=80)
        db.save_user_interview_evaluation(user['id'], 'pg-session', 0, 'Why?', 'Answer: 100%', 80, '{}')
        self.assertEqual(db.get_user_interview_session(user['id'], 'pg-session')['score'], 80)
        self.assertIsNone(db.get_user_interview_session(other['id'], 'pg-session'))
        resume = db.save_user_resume(user['id'], 'test.txt', ['Python'], 'A summary')
        self.assertIsInstance(resume['id'], int)
        self.assertEqual(len(db.get_user_resumes(user['id'])), 1)
        db.delete_user_account(user['id'], user['email'])
        self.assertIsNone(db.get_user_by_id(user['id']))
        self.assertEqual(db.get_user_resumes(user['id']), [])

    def test_rollback_on_error(self):
        from app.user_db import get_db_connection, get_user_by_email
        with self.assertRaises(RuntimeError):
            with get_db_connection() as conn:
                conn.cursor().execute("INSERT INTO users(email, full_name, hashed_password, role) VALUES (?, ?, ?, ?)",
                                      ('rollback@example.invalid', 'Rollback', 'unused', 'candidate'))
                raise RuntimeError('Abort transaction')
        self.assertIsNone(get_user_by_email('rollback@example.invalid'))
