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
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE (course_id, position)
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

-- ── Quiz Attempts ──────────────────────────────────────────────────────────────
-- Logs every /submit attempt so score history is preserved beyond the pass/fail.
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id           SERIAL PRIMARY KEY,
  user_id      INT          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  module_id    INT          NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  result       VARCHAR(16)  NOT NULL CHECK (result IN ('PASS', 'FAIL', 'INCOMPLETE')),
  score        SMALLINT     NOT NULL DEFAULT 0 CHECK (score BETWEEN 0 AND 100),
  feedback     TEXT,
  submitted_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Audit Log ─────────────────────────────────────────────────────────────────
-- Append-only event trail for compliance and debugging.
CREATE TABLE IF NOT EXISTS audit_log (
  id           BIGSERIAL    PRIMARY KEY,
  user_id      INT          REFERENCES users(id) ON DELETE SET NULL,
  event_type   VARCHAR(64)  NOT NULL,   -- e.g. 'enrol', 'module_pass', 'cert_issue'
  payload      JSONB,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS audit_log_user_idx  ON audit_log (user_id);
CREATE INDEX IF NOT EXISTS audit_log_event_idx ON audit_log (event_type);

-- ── Notifications ─────────────────────────────────────────────────────────────
-- Tracks outbound nudge DMs so we avoid spamming inactive learners.
CREATE TABLE IF NOT EXISTS notifications (
  id           SERIAL PRIMARY KEY,
  user_id      INT          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_type VARCHAR(64) NOT NULL DEFAULT 'nudge',
  message      TEXT         NOT NULL,
  sent_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications (user_id, sent_at);

-- ── Course Tags ────────────────────────────────────────────────────────────────
-- Flexible tagging for courses (e.g. 'compliance', 'onboarding', 'leadership').
CREATE TABLE IF NOT EXISTS course_tags (
  course_id    INT          NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  tag          VARCHAR(64)  NOT NULL,
  PRIMARY KEY (course_id, tag)
);
CREATE INDEX IF NOT EXISTS course_tags_tag_idx ON course_tags (tag);


-- ── Nudge Reactions ──────────────────────────────────────────────────────────
-- Tracks whether users reacted to proactive nudges so re-send logic can avoid
-- repeatedly nudging engaged learners.
CREATE TABLE IF NOT EXISTS nudge_reactions (
  id           BIGSERIAL    PRIMARY KEY,
  user_id      INT          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id    INT,
  reaction_type VARCHAR(64) NOT NULL, -- e.g. 'view_progress', 'resume_lesson', 'assignment_icon', 'assignment_submit'
  reacted_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  payload      JSONB
);
CREATE INDEX IF NOT EXISTS nudge_reactions_user_idx ON nudge_reactions (user_id, reacted_at DESC);

-- ── Assignment Submissions ───────────────────────────────────────────────────
-- Stores assignment proof metadata captured from Slack modal submissions.
CREATE TABLE IF NOT EXISTS assignment_submissions (
  id            BIGSERIAL    PRIMARY KEY,
  user_id       INT          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id     INT,
  course_title  VARCHAR(255),
  assignment_link TEXT,
  screenshot_url  TEXT,
  drive_filename  VARCHAR(255) NOT NULL,
  drive_file_id   VARCHAR(255),
  submitted_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  payload       JSONB
);
CREATE INDEX IF NOT EXISTS assignment_submissions_user_idx ON assignment_submissions (user_id, submitted_at DESC);
