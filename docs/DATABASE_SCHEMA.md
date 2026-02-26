# Database Schema Reference

This project uses **two complementary SQL schema files** serving different layers
of the stack. Both are idempotent (`IF NOT EXISTS`) and must be applied to the same
PostgreSQL 16 instance.

---

## Schema 1 — Runtime App Schema

**File**: `db/schema.sql`
**Purpose**: Slack app runtime — user identity, enrolments, module progress, nudges,
assignment submissions, and audit trail.
**Used by**: Node.js Bolt app (`src/`), n8n workflows, CSV analytics dashboard.

### Tables

| Table | Purpose |
|-------|---------|
| `users` | Learner identity (Slack user/team IDs, email, display name) |
| `courses` | Course catalogue — `code` field matches `/enroll <code>` |
| `modules` | Ordered modules within a course |
| `enrolments` | Learner ↔ course runtime position (`current_module_id`, `completed_at`) |
| `progress` | Per-user module completion records |
| `certificates` | Issued certificates (one per user-course) |
| `quiz_attempts` | Every `/submit` scored attempt — preserves score history |
| `notifications` | Outbound nudge DM log (dedup / cooldown reference) |
| `nudge_reactions` | Learner reactions to proactive nudge messages |
| `assignment_submissions` | Assignment proof metadata from Slack modal intake |
| `audit_log` | Append-only event trail for compliance and debugging |
| `course_tags` | Flexible course tagging (e.g. `compliance`, `onboarding`) |

### Key constraints and indexes

- Unique enrollment: `(user_id, course_id)` in `enrolments`
- Unique progress: `(user_id, module_id)` in `progress`
- Inactivity scans: index on `nudge_reactions(user_id, reacted_at DESC)`
- Assignment history: index on `assignment_submissions(user_id, submitted_at DESC)`

---

## Schema 2 — Content/Operational Schema

**File**: `data/lms_database_schema.sql`
**Purpose**: Notion-aligned content layer — stores authored lesson content (ULC fields),
learner progress against lessons (not modules), weekly quiz results, and agent
execution audit logs.
**Used by**: n8n content delivery workflows, Notion sync, agent audit trail.

### Tables

| Table | Purpose |
|-------|---------|
| `learners` | Learner identity with lifecycle status (`active`, `paused`, `withdrawn`, `completed`) |
| `courses` | Course catalogue with `notion_db_id` for Notion sync |
| `enrollments` | Learner ↔ course with `current_month`, `current_week`, `days_inactive` |
| `lessons` | Full ULC lesson records (hook, core_content, insight, takeaway, mission, verification, submit_command) |
| `lesson_progress` | Per-user lesson completion with score and attempt count |
| `quiz_attempts` | Weekly deep-dive assessment scores |
| `feedback_events` | Learner feedback stream with sentiment classification |
| `agent_audit_logs` | Supervisor/agent execution log (agent 1–14, status, latency) |

### Key constraints and indexes

- Unique lesson route: `(course_id, month, week, day)` in `lessons`
- Unique progress: `(user_id, lesson_id)` in `lesson_progress`
- Lesson route resolution index: `idx_lessons_course_month_week`
- Progress queries index: `idx_progress_user_status`
- Inactivity scans index: `idx_enrollments_activity`

---

## Mapping guidance

- **Write order**: Notion (content authoring) → `lessons` table → `lesson_progress` → Google Sheets dashboard.
- The `lessons.lesson_id` field is the immutable upsert key for Notion sync (`LessonID`).
- The `lessons.submit_command` field stores the auto-generated `/submit {lesson_id} complete`
  value that appears in every delivered lesson.
- `learners.user_id` in Schema 2 corresponds to `users.slack_user_id` in Schema 1 —
  both use the Slack user ID as the learner key.
- Both schemas are maintained together; Schema 1 serves the app runtime and Schema 2
  serves content delivery and analytics.

---

## Apply schemas

```bash
# Apply runtime schema
psql "$DATABASE_URL" -f db/schema.sql

# Apply content/operational schema
psql "$DATABASE_URL" -f data/lms_database_schema.sql
```

Both files are safe to re-run — all statements use `CREATE TABLE IF NOT EXISTS`.
