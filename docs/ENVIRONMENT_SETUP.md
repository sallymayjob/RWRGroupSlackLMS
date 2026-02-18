# Environment Setup (n8n)

This project is designed for **n8n workflow automation** with production-ready environment and deployment settings.

## 1) n8n Prerequisites

- n8n instance (cloud or self-hosted)
- PostgreSQL (required for production durability)
- Redis (required for queue mode workers)
- Slack app with slash commands + webhook access
- Gemini API key
- Notion integration + database ID(s)
- Workspace root page: `https://www.notion.so/Slack-LMS-RWR-Group-30558a9ec642819785c7d39dbce75ef1`
- LM Data Table backend (API/DB)
- Google service account with sheet access
- Email provider for admin reporting

## 2) Environment File

1. Copy `.env.example` to `.env`
2. Fill all secrets and URLs
3. Generate a strong `N8N_ENCRYPTION_KEY`

Critical required values:
- `N8N_HOST`, `N8N_PROTOCOL`, `WEBHOOK_URL`
- `N8N_EDITOR_BASE_URL`, `N8N_SECURE_COOKIE=true`
- `DB_POSTGRESDB_*`
- `QUEUE_BULL_REDIS_*`
- Slack, Notion, Gemini, Google, Email keys
- Notion IDs: `NOTION_ROOT_PAGE_ID`, `NOTION_COURSES_DB_ID`, `NOTION_MONTHS_DB_ID`, `NOTION_LESSONS_DB_ID`

## 3) Import Workflow JSON Files

1. In n8n, go to **Workflows → Import from File**.
2. Import `workflows/slack_supervisor.workflow.json`.
3. Import `workflows/agent_subworkflow_template.workflow.json`.
4. Duplicate template to create all 14 agent workflows.
5. Set workflow names to match README agent map.
6. Update Execute Workflow nodes in supervisor if names/IDs differ.

## 4) Credentials to Configure in n8n

- Slack OAuth2 / Bot Token
- Notion API credentials
- Google Sheets service account credentials
- Gemini API credentials (HTTP Request or AI node)
- SMTP/API email credentials

## 5) Slack Command Configuration

Register manifest commands in your Slack app:
- `/learn`
- `/quiz`
- `/progress`
- `/enroll`
- `/cert`
- `/report`
- `/gaps`
- `/onboard` (points to `https://<your-domain>/webhook/onboard`)

Legacy commands are still accepted for compatibility: `/submit`, `/complete`, `/feedback`, `/tutor`.

Set command Request URL:
- `https://<your-domain>/webhook/supervisor`


## 5A) Notion Workspace Binding (Your Database)

Use your provided workspace URL as the canonical root:
- `NOTION_WORKSPACE_URL=https://www.notion.so/Slack-LMS-RWR-Group-30558a9ec642819785c7d39dbce75ef1`

Set these values in `.env`:
- `NOTION_ROOT_PAGE_ID=30558a9ec642819785c7d39dbce75ef1`
- `NOTION_COURSES_DB_ID=<courses_db_id>`
- `NOTION_MONTHS_DB_ID=<months_db_id>`
- `NOTION_LESSONS_DB_ID=<lessons_db_id>`

How to extract a DB ID in Notion:
1. Open the database as a full page.
2. Copy link.
3. Use the 32-char ID from URL tail (remove hyphens if needed).
4. Paste into `.env` and n8n credentials/config nodes.

## 6) Data Sync Guardrails

Maintain write order:
1. Notion
2. LM Data Table
3. Google Sheets

Reliability controls:
- Idempotency key: `source:entity_id:version`
- Retries with backoff
- Dead-letter queue for persistent failures
- Audit log entry for each agent action

## 7) Production Deployment

For full stack deployment (Docker Compose, reverse proxy, queue workers, hardening, backups), see:
- `docs/DEPLOYMENT.md`

## 8) Go-Live Checklist

- All workflows imported and activated
- Slack commands verified end-to-end
- Agent 4 (`/submit`, `/complete`) state checks validated
- Friday quiz + assessment schedule configured
- Certification + manager/admin notifications enabled
- Reporting workflow updates dashboard successfully


## Database Schema Reference

Use `data/lms_database_schema.sql` as the operational schema baseline (see `docs/DATABASE_SCHEMA.md`).
