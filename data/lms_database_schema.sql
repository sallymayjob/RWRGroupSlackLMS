-- LEGACY/REFERENCE SCHEMA (non-deploy-time)
-- This file is maintained for analytics/reference compatibility.
-- Runtime deployment schema source of truth is db/schema.sql.

-- LMS canonical operational schema (PostgreSQL)
-- Aligns Slack command ingestion, Notion-authored content, learner state, and analytics.

CREATE TABLE IF NOT EXISTS learners (
  user_id TEXT PRIMARY KEY,
  email TEXT,
  display_name TEXT NOT NULL,
  slack_channel TEXT,
  status TEXT NOT NULL CHECK (status IN ('active','paused','withdrawn','completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS courses (
  course_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  notion_db_id TEXT,
  total_modules INT NOT NULL CHECK (total_modules > 0),
  status TEXT NOT NULL CHECK (status IN ('draft','active','archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS enrollments (
  enrollment_id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES learners(user_id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES courses(course_id) ON DELETE CASCADE,
  current_month INT NOT NULL CHECK (current_month BETWEEN 1 AND 12),
  current_week INT NOT NULL CHECK (current_week BETWEEN 1 AND 4),
  current_lesson_code TEXT,
  days_inactive INT NOT NULL DEFAULT 0 CHECK (days_inactive >= 0),
  last_activity_at TIMESTAMPTZ,
  UNIQUE (user_id, course_id)
);

CREATE TABLE IF NOT EXISTS lessons (
  lesson_id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL REFERENCES courses(course_id) ON DELETE CASCADE,
  month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  week INT NOT NULL CHECK (week BETWEEN 1 AND 4),
  day INT NOT NULL CHECK (day BETWEEN 1 AND 7),
  hook TEXT NOT NULL,
  core_content TEXT NOT NULL,
  insight TEXT NOT NULL,
  takeaway TEXT NOT NULL,
  mission TEXT NOT NULL,
  verification TEXT NOT NULL,
  submit_command TEXT NOT NULL,
  lesson_status TEXT NOT NULL CHECK (lesson_status IN ('ready','draft','review','empty')),
  sop5_validated BOOLEAN NOT NULL DEFAULT FALSE,
  qa_score NUMERIC(5,2) CHECK (qa_score IS NULL OR (qa_score >= 0 AND qa_score <= 100)),
  UNIQUE (course_id, month, week, day)
);

CREATE TABLE IF NOT EXISTS lesson_progress (
  progress_id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES learners(user_id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL REFERENCES lessons(lesson_id) ON DELETE CASCADE,
  submit_code TEXT,
  status TEXT NOT NULL CHECK (status IN ('not_started','in_progress','complete')),
  attempts INT NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  score NUMERIC(5,2) CHECK (score IS NULL OR (score >= 0 AND score <= 100)),
  completed_at TIMESTAMPTZ,
  UNIQUE (user_id, lesson_id)
);

CREATE TABLE IF NOT EXISTS quiz_attempts (
  attempt_id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES learners(user_id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES courses(course_id) ON DELETE CASCADE,
  week INT NOT NULL CHECK (week BETWEEN 1 AND 4),
  score NUMERIC(5,2) CHECK (score IS NULL OR (score >= 0 AND score <= 100)),
  duration_minutes INT CHECK (duration_minutes IS NULL OR duration_minutes >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS feedback_events (
  feedback_id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES learners(user_id) ON DELETE CASCADE,
  lesson_id TEXT REFERENCES lessons(lesson_id) ON DELETE SET NULL,
  feedback_text TEXT NOT NULL,
  sentiment TEXT CHECK (sentiment IS NULL OR sentiment IN ('positive','neutral','negative','confused')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agent_audit_logs (
  log_id BIGSERIAL PRIMARY KEY,
  agent_id INT NOT NULL CHECK (agent_id BETWEEN 1 AND 14),
  command TEXT,
  user_id TEXT REFERENCES learners(user_id) ON DELETE SET NULL,
  request_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('success','failed','blocked')),
  error_reason TEXT,
  latency_ms NUMERIC(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lessons_course_month_week ON lessons(course_id, month, week);
CREATE INDEX IF NOT EXISTS idx_progress_user_status ON lesson_progress(user_id, status);
CREATE INDEX IF NOT EXISTS idx_enrollments_activity ON enrollments(last_activity_at);
CREATE INDEX IF NOT EXISTS idx_audit_agent_created ON agent_audit_logs(agent_id, created_at DESC);
