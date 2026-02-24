-- RWRGroup Agentic LMS — initial schema
-- Run against the lms_db database to set up tables.

-- ── Users ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  slack_user_id VARCHAR(32)  NOT NULL UNIQUE,
  slack_team_id VARCHAR(32)  NOT NULL,
  email         VARCHAR(255),
  display_name  VARCHAR(255),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Courses ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS courses (
  id          SERIAL PRIMARY KEY,
  code        VARCHAR(64)   NOT NULL UNIQUE,  -- used in /enroll <code>
  title       VARCHAR(255)  NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ── Modules ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS modules (
  id          SERIAL PRIMARY KEY,
  course_id   INT           NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  position    INT           NOT NULL DEFAULT 0,  -- order within the course
  title       VARCHAR(255)  NOT NULL,
  content     TEXT,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ── Enrolments ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS enrolments (
  id                SERIAL PRIMARY KEY,
  user_id           INT          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id         INT          NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  current_module_id INT          REFERENCES modules(id),
  enrolled_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  completed_at      TIMESTAMPTZ,
  UNIQUE (user_id, course_id)
);

-- ── Progress ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS progress (
  id           SERIAL PRIMARY KEY,
  user_id      INT          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  module_id    INT          NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, module_id)
);

-- ── Certificates ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS certificates (
  id           SERIAL PRIMARY KEY,
  user_id      INT          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id    INT          NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  issued_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, course_id)
);
