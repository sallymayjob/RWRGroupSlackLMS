# Database Schema (Operational Layer)

The canonical SQL schema is in:
- `data/lms_database_schema.sql`

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
