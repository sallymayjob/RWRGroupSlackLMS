# Deployment Guide (n8n + Slack LMS)

This guide completes production deployment details for the Slack LMS n8n automation stack.

## 0) Repository layout (for operations)

- `src/`: Slack Bolt runtime service.
- `db/schema.sql`: deploy-time canonical schema for new environments.
- `db/migrations/`: ordered incremental schema changes (`V<version>__<description>.sql`).
- `n8n/workflows/`: agent workflow definitions used by n8n.
- `docs/`: canonical operating docs (this file, env setup, DB schema, security).

## 1) Deployment Topology

Recommended production topology:

- **n8n** in queue mode (workflow editor + webhook receiver + workers)
- **PostgreSQL** for n8n persistence
- **Redis** for queue transport
- **Reverse proxy** (Nginx/Caddy/Traefik) with HTTPS
- Optional: external managed services for PostgreSQL/Redis

## 2) Required Environment Variables

Use `.env.example` as baseline. Critical values:

- `N8N_HOST`, `N8N_PROTOCOL`, `WEBHOOK_URL`
- `N8N_ENCRYPTION_KEY`
- `DB_TYPE`, `DB_POSTGRESDB_*`
- `NOTION_WORKSPACE_URL`, `NOTION_ROOT_PAGE_ID`, `NOTION_*_DB_ID`
- `QUEUE_BULL_REDIS_*`
- `N8N_DIAGNOSTICS_ENABLED=false`
- `N8N_PERSONALIZATION_ENABLED=false`

## 3) Self-Hosted with Docker Compose

1. Copy `.env.example` to `.env`
2. Fill production secrets and integration keys
3. Start stack:

```bash
docker compose up -d
```

4. Open n8n:

- `https://<your-domain>`
- complete owner account bootstrap

## 4) Reverse Proxy + TLS

Requirements:

- Public HTTPS endpoint for Slack commands/events
- Forward all `POST /webhook/*` requests to n8n
- Preserve `X-Forwarded-*` headers

Example upstream target inside Docker network:
- `http://n8n:5678`

## 5) Slack App Configuration

Set command Request URLs to:

- `https://<your-domain>/webhook/supervisor`

Commands:
- `/learn`
- `/submit`
- `/progress`
- `/enroll`
- `/cert`
- `/report`
- `/gaps`
- `/onboard` (points to `https://<your-domain>/webhook/onboard`)

Legacy commands (optional): `/complete`, `/feedback`, `/tutor`.

Enable and configure:
- OAuth scopes (chat:write, commands, users:read as needed)
- Signing secret validation in workflow logic

## 5A) Notion Workspace IDs

Use your root page URL:
- `https://www.notion.so/Slack-LMS-RWR-Group-30558a9ec642819785c7d39dbce75ef1`

Wire these env vars and workflow constants before activating:
- `NOTION_ROOT_PAGE_ID=30558a9ec642819785c7d39dbce75ef1`
- `NOTION_COURSES_DB_ID`
- `NOTION_MONTHS_DB_ID`
- `NOTION_LESSONS_DB_ID`

## 6) n8n Workflow Deployment Steps

1. Import `workflows/slack_supervisor.workflow.json`
2. Import `workflows/slack_onboard.workflow.json`
3. Import `workflows/agent_subworkflow_template.workflow.json`
4. Clone template into all agent workflows (1–14)
5. Update `Execute Workflow` references
6. Configure credentials:
   - Slack
   - Notion
   - Google Sheets
   - Gemini (HTTP Request)
   - SMTP/Email provider
7. Activate workflows

## 7) Scheduling Jobs

Add Cron workflows for:

- Mon–Fri micro-learning dispatch
- Friday deep-dive quiz + assessment
- Weekly certification + manager summary
- Daily stuck-learner gap analysis

## 8) Data Reliability Controls

Implement in workflow nodes:

- Idempotency key: `source:entity_id:version`
- Retry policy for Notion/LM table/Sheets writes
- Dead-letter handling (failed items table/email alert)
- Ordered writes: Notion -> LM table -> Google Sheets

## 9) Security Hardening

- Rotate API keys every 60–90 days
- Restrict service-account permissions to minimum scope
- Use `N8N_SECURE_COOKIE=true`
- Set editor auth and avoid public editor access
- Backup encrypted n8n DB daily

## 10) Monitoring & Operations

Track:

- Webhook success rate
- Agent workflow failure counts
- Queue lag (Redis)
- Sync drift (Notion vs LM table vs Sheets)

Operational actions:

- Alert on repeated workflow failures
- Alert on queue lag threshold breach
- Weekly dashboard reconciliation report

## 11) Backup & Recovery

Minimum backup policy:

- PostgreSQL daily snapshot + point-in-time logs
- Redis backup (if storing delayed jobs)
- Versioned export of all n8n workflows/credentials metadata

Recovery drill cadence:
- monthly restore test in staging

## 12) Staging-to-Production Promotion

1. Validate all slash commands in staging workspace
2. Run sample payload tests from `workflows/payload_examples.json`
3. Validate one full weekly cycle (quiz + certification)
4. Promote env vars and credentials to production
5. Activate workflows in production during low traffic window


## Database Schema Reference

Use `db/schema.sql` as the deploy-time canonical schema baseline (see `docs/DATABASE_SCHEMA.md`).

Apply schema changes after bootstrap from `db/migrations/` using ascending versions with the format `V<version>__<description>.sql` (for example `V0002__add_quiz_attempt_indexes.sql`).

Versioning rules:
- Migrations are append-only and immutable after release.
- Versions must be strictly increasing.
- `db/schema.sql` should be periodically reconciled to match the latest migrated state for new-environment bootstrap.


## Content Architect Prompt Binding

Before activating `agent_01_content_architect`, copy `docs/CONTENT_ARCHITECT_MASTER_PROMPT.md` into your Claude Project Custom Instructions and upload the required knowledge-base documents referenced in that prompt.
