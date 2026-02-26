# Environment Setup (n8n)

This project is designed for **n8n workflow automation** with production-ready environment and deployment settings.

## 1) n8n Prerequisites

- n8n instance (cloud or self-hosted)
- PostgreSQL (required for production durability)
- Redis (required for queue mode workers)
- Slack app with slash commands + webhook access
- Gemini API key
- Google service account with sheet access
- Email provider for admin reporting

## 2) Environment File

1. Copy `.env.example` to `.env`
2. Fill all secrets and URLs
3. Generate a strong `N8N_ENCRYPTION_KEY` (`openssl rand -hex 32`)

Critical required values:
- `N8N_HOST`, `N8N_PROTOCOL`, `WEBHOOK_URL`
- `N8N_EDITOR_BASE_URL`, `N8N_SECURE_COOKIE=true`
- `N8N_ENCRYPTION_KEY` — **CRITICAL**: if lost, all stored credentials are unrecoverable
- `DB_POSTGRESDB_*`
- `QUEUE_BULL_REDIS_*`
- Slack, Gemini, Google, Email keys

## 3) Import Workflow JSON Files

1. In n8n, go to **Workflows → Import from File**.
2. Import in this order:
   1. `n8n/workflows/supervisor-router.json` — central command router
   2. `n8n/workflows/agent-13-onboarding-agent.json` — onboard flow
   3. `n8n/workflows/agent-14-backup-to-sheets.json` — backup flow
   4. `n8n/workflows/agent-02-quiz-master.json` through `agent-15-assignment-intake.json` — all 13 sub-agents
3. Update `Execute Workflow` node references if workflow names/IDs differ after import.

See `docs/SLACK_MANIFEST_INTEGRATION.md` for the full command → agent routing map.

## 4) Credentials to Configure in n8n

- Slack Bot Token / Signing Secret
- Google Sheets service account credentials (`Google Sheets (LMS Backup)`)
- LMS Postgres connection (`LMS Postgres`)
- Gemini API credentials (HTTP Request or AI node)
- SMTP/API email credentials

## 5) Slack Command Configuration

All 12 commands are registered in `slack_manifest.json`. Apply the manifest via the Slack UI or Slack CLI.

Supervisor route (`https://<your-domain>/webhook/supervisor`):
- `/learn`
- `/submit`
- `/progress`
- `/enroll`
- `/unenroll`
- `/cert`
- `/report`
- `/gaps`
- `/courses`
- `/help`

Dedicated routes:
- `/onboard` → `https://<your-domain>/webhook/onboard`
- `/backup` → `https://<your-domain>/webhook/backup`

See `slack_manifest.json` (root) as the source of truth for all command definitions and OAuth scopes.

## 6) Data Reliability Controls

Maintain write order across integrations:
1. PostgreSQL (primary)
2. Google Sheets (backup)

Reliability controls built into n8n workflows:
- Retries with backoff on HTTP nodes
- Dead-letter handling for persistent failures
- Audit log entry for each agent action (`audit_log` table)

## 7) Production Deployment

For full stack deployment (Docker Compose, reverse proxy, queue workers, hardening, backups), see:
- `DEPLOYMENT.md` (root) — comprehensive full-stack guide
- `docs/DEPLOYMENT.md` — n8n workflow deployment supplement

## 8) Go-Live Checklist

- All workflows imported and activated in n8n
- Slack manifest applied; all 12 commands verified end-to-end
- Supervisor Switch routes tested for each command
- Proactive nudge schedule (Mon–Fri 09:00 UTC) confirmed active
- `/backup` nightly schedule (2am UTC) confirmed active
- Certification + manager/admin notifications enabled
- Reporting workflow updates dashboard successfully

## Database Schema Reference

Apply both schema files before first launch (see `docs/DATABASE_SCHEMA.md` for full details):
- `db/schema.sql` — runtime app schema (users, enrolments, modules, progress, nudges, assignments)
- `data/lms_database_schema.sql` — content/operational schema (learners, lessons, lesson_progress, agent_audit_logs)

## Content Architect Prompt Setup

For `agent_01_content_architect`, set your Claude Project Custom Instructions from:
- `docs/CONTENT_ARCHITECT_MASTER_PROMPT.md`

Upload these files to the Claude project knowledge base as required by the prompt:
- Brand Guidelines
- ULC Template
- Course Map
- SOP-05
- Prompt Library
