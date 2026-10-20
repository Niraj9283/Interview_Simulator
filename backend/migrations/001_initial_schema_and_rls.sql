-- ==============================================================================
-- MockMate AI - Production PostgreSQL Schema & Row-Level Security (RLS) Policies
-- Migration: 001_initial_schema_and_rls.sql
-- ==============================================================================

-- 1. Enable pgcrypto for UUID and secure hashing if needed
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(120) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'interviewer', 'candidate')),
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    email_verification_token_hash VARCHAR(64),
    email_verification_expires_at BIGINT,
    email_verification_sent_at BIGINT,
    password_reset_token_hash VARCHAR(64),
    password_reset_expires_at BIGINT,
    onboarding_completed BOOLEAN DEFAULT FALSE,
    target_role VARCHAR(120),
    experience_level VARCHAR(60),
    department VARCHAR(60),
    token_version INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 3. User Interview Sessions Table
CREATE TABLE IF NOT EXISTS user_interview_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id VARCHAR(64) UNIQUE NOT NULL,
    role VARCHAR(120) NOT NULL,
    department VARCHAR(60) NOT NULL,
    difficulty VARCHAR(30) NOT NULL,
    score INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_interview_sessions(user_id);

-- 4. User Interview Answer Evaluations Table
CREATE TABLE IF NOT EXISTS user_interview_evaluations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id VARCHAR(64) NOT NULL,
    turn_index INTEGER NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    score INTEGER NOT NULL,
    feedback_json JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_evals_user_session ON user_interview_evaluations(user_id, session_id);

-- 5. User Resumes Table
CREATE TABLE IF NOT EXISTS user_resumes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    extracted_skills JSONB,
    summary TEXT,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_resumes_user_id ON user_resumes(user_id);

-- 6. User Settings Table
CREATE TABLE IF NOT EXISTS user_settings (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    preferences_json JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_email VARCHAR(120),
    action VARCHAR(80) NOT NULL,
    ip_address VARCHAR(45),
    status VARCHAR(20) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- ROW-LEVEL SECURITY (RLS) ACTIVATION
-- ==============================================================================

ALTER TABLE user_interview_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_interview_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Helper function to extract current session user_id safely (empty string safe)
CREATE OR REPLACE FUNCTION current_app_user_id() RETURNS INTEGER AS $$
BEGIN
    RETURN NULLIF(current_setting('app.current_user_id', true), '')::INTEGER;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- Helper function to check if current session is an admin
CREATE OR REPLACE FUNCTION is_app_admin() RETURNS BOOLEAN AS $$
BEGIN
    RETURN current_setting('app.is_admin', true) = 'true';
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE;

-- ------------------------------------------------------------------------------
-- Policies for user_interview_sessions
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS user_sessions_isolation_select ON user_interview_sessions;
CREATE POLICY user_sessions_isolation_select ON user_interview_sessions
    FOR SELECT
    USING (user_id = current_app_user_id() OR is_app_admin());

DROP POLICY IF EXISTS user_sessions_isolation_insert ON user_interview_sessions;
CREATE POLICY user_sessions_isolation_insert ON user_interview_sessions
    FOR INSERT
    WITH CHECK (user_id = current_app_user_id() OR is_app_admin());

DROP POLICY IF EXISTS user_sessions_isolation_update ON user_interview_sessions;
CREATE POLICY user_sessions_isolation_update ON user_interview_sessions
    FOR UPDATE
    USING (user_id = current_app_user_id() OR is_app_admin())
    WITH CHECK (user_id = current_app_user_id() OR is_app_admin());

DROP POLICY IF EXISTS user_sessions_isolation_delete ON user_interview_sessions;
CREATE POLICY user_sessions_isolation_delete ON user_interview_sessions
    FOR DELETE
    USING (user_id = current_app_user_id() OR is_app_admin());

-- ------------------------------------------------------------------------------
-- Policies for user_interview_evaluations
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS user_evals_isolation_select ON user_interview_evaluations;
CREATE POLICY user_evals_isolation_select ON user_interview_evaluations
    FOR SELECT
    USING (user_id = current_app_user_id() OR is_app_admin());

DROP POLICY IF EXISTS user_evals_isolation_insert ON user_interview_evaluations;
CREATE POLICY user_evals_isolation_insert ON user_interview_evaluations
    FOR INSERT
    WITH CHECK (user_id = current_app_user_id() OR is_app_admin());

DROP POLICY IF EXISTS user_evals_isolation_update ON user_interview_evaluations;
CREATE POLICY user_evals_isolation_update ON user_interview_evaluations
    FOR UPDATE
    USING (user_id = current_app_user_id() OR is_app_admin())
    WITH CHECK (user_id = current_app_user_id() OR is_app_admin());

DROP POLICY IF EXISTS user_evals_isolation_delete ON user_interview_evaluations;
CREATE POLICY user_evals_isolation_delete ON user_interview_evaluations
    FOR DELETE
    USING (user_id = current_app_user_id() OR is_app_admin());

-- ------------------------------------------------------------------------------
-- Policies for user_resumes
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS user_resumes_isolation_all ON user_resumes;
CREATE POLICY user_resumes_isolation_all ON user_resumes
    FOR ALL
    USING (user_id = current_app_user_id() OR is_app_admin())
    WITH CHECK (user_id = current_app_user_id() OR is_app_admin());

-- ------------------------------------------------------------------------------
-- Policies for user_settings
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS user_settings_isolation_all ON user_settings;
CREATE POLICY user_settings_isolation_all ON user_settings
    FOR ALL
    USING (user_id = current_app_user_id() OR is_app_admin())
    WITH CHECK (user_id = current_app_user_id() OR is_app_admin());
