# Deployment Guide — RWRGroup Agentic LMS

This document covers everything needed to go from a blank server to a fully running LMS, including local development, production Docker deployment, Nginx reverse proxy, n8n workflow import, and upgrade procedures.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Create the Slack App](#2-create-the-slack-app)
3. [Clone and Configure](#3-clone-and-configure)
4. [Local Development](#4-local-development)
5. [Production Deployment (Docker)](#5-production-deployment-docker)
6. [Nginx Reverse Proxy](#6-nginx-reverse-proxy)
7. [Database Schema](#7-database-schema)
8. [n8n Workflow Import](#8-n8n-workflow-import)
9. [Verify the Installation](#9-verify-the-installation)
10. [Upgrading](#10-upgrading)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Node.js | ≥ 20 | LTS recommended |
| npm | ≥ 10 | bundled with Node 20 |
| Docker | ≥ 24 | for the full stack |
| Docker Compose | v2 | `docker compose` (not `docker-compose`) |
| PostgreSQL client | 16 | `psql` — for schema migration |
| A public HTTPS URL | — | Slack requires HTTPS for event delivery; use a reverse proxy or a tunnel (e.g. ngrok) for local dev |
| Slack workspace | — | Admin access to create and install an app |
| n8n instance | ≥ 1.0 | Self-hosted or cloud; must be reachable from this app |

---

## 2. Create the Slack App

1. Go to [api.slack.com/apps](https://api.slack.com/apps) and click **Create New App**.
2. Choose **From a manifest** and select your workspace.
3. Paste the contents of `slack_manifest.json` from this repository.
4. Replace every `https://YOUR_APP_URL` placeholder in the manifest with your public HTTPS URL (e.g. `https://lms.example.com`). The Bolt app listens on `/slack/events`.
5. Click **Next → Create**.
6. Under **Install App**, click **Install to Workspace** and approve the OAuth scopes.
7. Copy the values you will need for `.env`:
   - **Bot User OAuth Token** → `SLACK_BOT_TOKEN`
   - **Signing Secret** (under *Basic Information*) → `SLACK_SIGNING_SECRET`

---

## 3. Clone and Configure

```bash
git clone <repo-url> RWRGroupSlackLMS
cd RWRGroupSlackLMS

# Install Node dependencies
npm install

# Create your local environment file
cp .env.example .env
```

Edit `.env` and fill using the canonical env matrix below:

### Canonical environment matrix

<!-- REQUIRED_ENV_VARS_START -->
- `SLACK_BOT_TOKEN`
- `SLACK_SIGNING_SECRET`
- `DATABASE_URL`
- `REDIS_URL`
- `N8N_BASE_URL`
<!-- REQUIRED_ENV_VARS_END -->

| Variable | Required | Used by | Notes |
|----------|----------|---------|-------|
| `SLACK_BOT_TOKEN` | Yes | Slack Bolt app auth | Bot token from Slack app config |
| `SLACK_SIGNING_SECRET` | Yes | Slack request verification | Signing secret from Slack app config |
| `DATABASE_URL` | Yes | Postgres connection (`src/db`) | Example: `postgresql://...` |
| `REDIS_URL` | Yes | Redis cache connection (`src/cache`) | Example: `redis://...` |
| `N8N_BASE_URL` | Yes | n8n forwarding service | Base URL used to build webhook URLs |
| `N8N_WEBHOOK_SECRET` | No | n8n forwarding service | Optional `X-Webhook-Secret` header |
| `N8N_TIMEOUT_MS` | No | n8n forwarding service | Optional timeout override, default `2500` |
| `N8N_RETRY_LIMIT` | No | n8n forwarding service | Optional retry count, default `2` |
| `N8N_MAX_PAYLOAD_BYTES` | No | n8n forwarding service | Optional max payload size, default `262144` |
| `PORT` | No | HTTP server bind port | Defaults to `3000` |
| `GOOGLE_SHEETS_BACKUP_ID` | No | Backup workflow handlers | Required only for Google Sheets backup flows |
| `SLACK_ADMIN_WEBHOOK_URL` | No | Backup notification handlers | Required only for backup status notifications |

```env
# Required startup variables
SLACK_BOT_TOKEN=xoxb-...
SLACK_SIGNING_SECRET=...
DATABASE_URL=postgresql://lms_user:STRONG_PASSWORD@localhost:5432/lms_db
REDIS_URL=redis://localhost:6379
N8N_BASE_URL=https://n8n.your-domain.com

# Optional runtime tuning / features
N8N_WEBHOOK_SECRET=choose-a-strong-random-secret
N8N_TIMEOUT_MS=2500
N8N_RETRY_LIMIT=2
N8N_MAX_PAYLOAD_BYTES=262144
PORT=3000
GOOGLE_SHEETS_BACKUP_ID=your-spreadsheet-id
SLACK_ADMIN_WEBHOOK_URL=https://hooks.slack.com/services/...
```

> The app will refuse to start if any of the five required startup variables are missing.

### Legacy / advanced n8n-only variables

If you also self-host n8n, you may need additional n8n runtime variables such as:
`N8N_HOST`, `N8N_PROTOCOL`, `WEBHOOK_URL`, `N8N_EDITOR_BASE_URL`, `N8N_SECURE_COOKIE`, `DB_POSTGRESDB_*`, `QUEUE_BULL_REDIS_*`, etc.
These are not required by this Node app startup check.

---

## 4. Local Development

Docker Compose starts Postgres and Redis; the Node app runs on the host with hot-reload.

```bash
# Start backing services
docker compose up postgres redis -d

# Wait for Postgres to be healthy, then apply the schema
psql "$DATABASE_URL" -f db/schema.sql

# Start the app with hot-reload
npm run dev
```

The app listens on `http://localhost:3000`. To expose it to Slack during local dev, use a tunnel:

```bash
# Example with ngrok (install separately)
ngrok http 3000
# Copy the https:// URL into your Slack app manifest and re-save
```

`docker-compose.override.yml` (committed) automatically mounts the source tree into the container when you run `docker compose up`, enabling live code changes without a rebuild.

---

## 5. Production Deployment (Docker)

### 5.1 Build and start

```bash
# On the production server, with .env populated
docker compose -f docker-compose.yml up --build -d
```

Using `-f docker-compose.yml` explicitly skips the dev override file.

### 5.2 Apply the database schema

Run this once on first deploy (safe to re-run — all statements are `IF NOT EXISTS`):

```bash
docker compose exec postgres psql \
  -U "$POSTGRES_USER" \
  -d "$POSTGRES_DB" \
  -f /dev/stdin < db/schema.sql
```

Or from the host if `psql` is installed:

```bash
psql "$DATABASE_URL" -f db/schema.sql
```

### 5.3 Service overview

| Service | Image | Port | Notes |
|---------|-------|------|-------|
| `app` | local build | 3000 (internal) | Bolt HTTP app; exposed via Nginx |
| `n8n` | `n8nio/n8n:1.107.4` | 127.0.0.1:5678 | loopback only; access via Nginx or SSH tunnel |
| `postgres` | `postgres:16-alpine` | 127.0.0.1:5432 | loopback only |
| `redis` | `redis:7-alpine` | 127.0.0.1:6379 | loopback only |

### 5.4 Useful commands

```bash
# View running containers
docker compose ps

# Stream logs
docker compose logs -f app

# Restart the app only (after a code change)
docker compose up --build -d app

# Open a Postgres shell
docker compose exec postgres psql -U lms_user -d lms_db
```

---

## 6. Nginx Reverse Proxy

Place the provided config in your Nginx sites directory and enable it:

```bash
sudo cp nginx/lms.conf /etc/nginx/sites-available/lms
sudo ln -s /etc/nginx/sites-available/lms /etc/nginx/sites-enabled/lms
sudo nginx -t && sudo systemctl reload nginx
```

Then obtain a TLS certificate (Slack **requires** HTTPS):

```bash
sudo certbot --nginx -d lms.example.com
```

The config at `nginx/lms.conf` includes:
- HTTPS with HTTP→HTTPS redirect
- Proxy to the Bolt app on port 3000
- Rate limiting for Slack event ingestion
- Gzip compression
- Security headers

---

## 7. Database Schema

The schema lives in `db/schema.sql` and is idempotent (all `CREATE TABLE IF NOT EXISTS`). Tables created:

| Table | Purpose |
|-------|---------|
| `users` | Slack user registry |
| `courses` | Course catalogue |
| `modules` | Lessons within each course |
| `enrolments` | User–course enrolment records |
| `progress` | Module completion records |
| `certificates` | Issued certificates |
| `quiz_attempts` | Full quiz history (pass/fail/score) |
| `audit_log` | Append-only compliance event trail |
| `notifications` | Outbound nudge DM log |
| `course_tags` | Flexible course tagging |

To apply:

```bash
psql "$DATABASE_URL" -f db/schema.sql
```

---

## 8. n8n Workflow Import

All workflow definitions are version-controlled in `n8n/workflows/`.

### 8.1 Import workflows

1. Open your n8n instance (`https://n8n.your-domain.com` or `http://localhost:5678`).
2. Go to **Workflows** → click the **⋮** menu → **Import from file**.
3. Import each file from `n8n/workflows/` in this order:

   | File | Description |
   |------|-------------|
   | `supervisor-router.json` | **Import first** — central router all commands pass through |
   | `agent-02-quiz-master.json` | `/submit` handler |
   | `agent-03-tutor.json` | `/learn` handler |
   | `agent-04-progress-tracker.json` | `/progress` handler |
   | `agent-05-course-catalog.json` | `/courses` handler |
   | `agent-06-help.json` | `/help` handler |
   | `agent-07-certification.json` | `/cert` handler |
   | `agent-08-enrollment-manager.json` | `/enroll` handler |
   | `agent-09-gap-analyst.json` | `/gaps` handler (Gemini) |
   | `agent-10-unenroll.json` | `/unenroll` handler |
   | `agent-11-proactive-nudge.json` | Scheduled learner nudge (cron) |
   | `agent-12-reporting-agent.json` | `/report` handler (Gemini) |
   | `agent-13-onboarding-agent.json` | `/onboard` handler (Gemini) |
   | `agent-14-backup-to-sheets.json` | `/backup` + nightly 2am UTC cron |

4. **Activate** each workflow using the toggle in the top-right corner.

### 8.2 Configure credentials in n8n

Go to **Settings → Credentials** and create:

| Credential name | Type | Used by |
|-----------------|------|---------|
| `LMS Postgres` | PostgreSQL | All agents that query the database |
| `Google Sheets (LMS Backup)` | Google Sheets OAuth2 | Agent 14 |
| `Gemini API` | HTTP Header Auth | Agents 09, 12, 13 |

Fill in the connection details from your `.env` file for Postgres, and authorise Google OAuth for Sheets.

### 8.3 Set environment variables in n8n

Under **Settings → Variables**, add:

| Key | Value |
|-----|-------|
| `SLACK_SIGNING_SECRET` | same as your `.env` |
| `SLACK_ADMIN_WEBHOOK_URL` | same as your `.env` |

### 8.4 Verify webhook endpoints

The supervisor router listens at:

```
POST https://n8n.your-domain.com/webhook/supervisor
POST https://n8n.your-domain.com/webhook/onboard
POST https://n8n.your-domain.com/webhook/backup
POST https://n8n.your-domain.com/webhook/slack-interactions
POST https://n8n.your-domain.com/webhook/slack/events
```

Confirm these match `N8N_BASE_URL` + the routes in `src/services/n8n.js`.

---

## 9. Verify the Installation

```bash
# 1. App health
curl https://lms.example.com/health
# → {"status":"ok","ts":"..."}

# 2. Slack signature (send a test event from the Slack app dashboard)
# Under api.slack.com → Event Subscriptions → "Send Test Event"

# 3. End-to-end command test
# In your Slack workspace, run: /progress
# You should receive a response from the Progress Tracker agent within a few seconds.
```

Docker container health:

```bash
docker compose ps
# All services should show "healthy"
```

---

## 10. Upgrading

```bash
# Pull latest code
git pull origin main

# Rebuild and restart the app container only
docker compose -f docker-compose.yml up --build -d app

# Re-apply schema (safe — IF NOT EXISTS on all statements)
psql "$DATABASE_URL" -f db/schema.sql

# Re-import any updated n8n workflows via the n8n UI
# (Workflows → Import from file → select updated JSON)
```

For n8n version upgrades, update the image tag in `docker-compose.yml` and run:

```bash
docker compose -f docker-compose.yml pull n8n
docker compose -f docker-compose.yml up -d n8n
```

---

## 11. Troubleshooting

### App won't start — "Missing required environment variables"

Check `.env` contains all five required startup vars listed in the canonical matrix above: `SLACK_BOT_TOKEN`, `SLACK_SIGNING_SECRET`, `DATABASE_URL`, `REDIS_URL`, `N8N_BASE_URL`.

### Slash commands return "dispatch_failed" from Slack

- The app URL in `slack_manifest.json` is incorrect or unreachable.
- The app is not running or the health check is failing: `curl https://lms.example.com/health`.
- Nginx is not forwarding to port 3000 correctly.

### Commands ack but users get no response

- Check that the n8n supervisor router workflow is **activated**.
- Verify `N8N_BASE_URL` in `.env` matches the actual n8n instance URL.
- Check n8n execution logs for errors: **n8n → Executions**.
- Ensure `N8N_WEBHOOK_SECRET` matches the value configured in n8n header auth (if used).

### Postgres connection errors

```bash
# Test the connection from inside the app container
docker compose exec app node -e "require('./src/db').connect().then(() => console.log('ok'))"
```

### n8n can't reach Postgres

n8n runs inside Docker on the same network as Postgres. Use `postgres` as the hostname in n8n credentials (not `localhost`).

### Google Sheets backup fails

- Confirm `GOOGLE_SHEETS_BACKUP_ID` is the ID portion of the spreadsheet URL (`.../spreadsheets/d/<ID>/edit`).
- Reauthorise the Google Sheets OAuth2 credential in n8n if the token has expired.
