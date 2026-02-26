# Database Schema (Operational Layer)

## Canonical runtime schema

Use `db/schema.sql` as the **deploy-time canonical schema** for the Slack LMS operational database.

Apply it for:
- new environment bootstrap
- baseline schema validation in CI/CD
- operational table/constraint/index review

## Legacy/reference schema file

`data/lms_database_schema.sql` is retained as a **legacy analytical/reference artifact**.
It is not the deploy-time schema source and should not be used for production bootstrap.

## Migration source of truth

Schema evolution after baseline bootstrap is tracked under:
- `db/migrations/`

Migration versioning strategy:
- Filename format: `V<version>__<description>.sql`
- Example: `V0002__add_quiz_attempt_indexes.sql`
- Versions are strictly increasing and never rewritten after deployment
- `db/schema.sql` should be updated to reflect the latest accumulated migration state

## Core tables

- `learners`: learner identity + state flags.
- `courses`: curriculum-level course entities.
- `enrollments`: learner-to-course runtime position (`current_month`, `current_week`, inactivity).
- `lessons`: normalized ULC lesson records tied to course/month/week/day.
- `lesson_progress`: per-user progress and scores by lesson.
- `quiz_attempts`: weekly deep-dive assessments.
- `feedback_events`: learner feedback stream for analysis.
- `agent_audit_logs`: supervisor/agent execution logs.

## Integrity constraints included

- Status checks (learner/course/progress lifecycle).
- Numeric bounds (`score` 0-100, valid month/week/day ranges).
- Relational foreign keys with controlled deletion strategies.
- Unique constraints for enrollment and per-lesson progress.

## Indexes included

- lesson route resolution: `(course_id, month, week)`
- learner progress queries: `(user_id, status)`
- inactivity scans: `(last_activity_at)`
- audit investigations: `(agent_id, created_at DESC)`

## Mapping guidance

- Notion remains authoring source for curriculum content.
- This SQL schema is the operational mirror for deterministic reporting and automation-state transitions.
- Keep write order: Notion → operational DB/LM table → Google Sheets dashboard.
