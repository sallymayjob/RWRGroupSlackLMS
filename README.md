# RWRGroup Agentic LMS

A Slack-integrated Learning Management System powered by AI agents (n8n) for the RWR Group organisation.

> For full installation instructions see **[DEPLOYMENT.md](./DEPLOYMENT.md)**.

> Independent production readiness audit: **[docs/FULL_PRODUCTION_READINESS_REVIEW.md](./docs/FULL_PRODUCTION_READINESS_REVIEW.md)**.

> Codebase organization/conflict audit: **[docs/CODEBASE_ORGANIZATION_CONFLICT_AUDIT.md](./docs/CODEBASE_ORGANIZATION_CONFLICT_AUDIT.md)**.

---

## Architecture

```
Slack user
    │  slash command / DM / @mention
    ▼
Slack API ──► This app (Bolt HTTP, port 3000)
                  │  signature verified · ack() sent immediately (< 3s)
                  ▼
          n8n Supervisor Router  (POST /webhook/supervisor)
                  │
                  ├─ Parse Slack Payload (Code node)
                  ├─ Edit Fields  — normalises fields, extracts `lesson` number
                  │
                  └─ Switch on command
                        /learn    ──► Agent 03 — Tutor
                        /submit   ──► Agent 02 — Quiz Master
                        /progress ──► Agent 04 — Progress Tracker
                        /enroll   ──► Agent 08 — Enrollment Manager
                        /unenroll ──► Agent 10 — Unenroll
                        /cert     ──► Agent 07 — Certification
                        /report   ──► Agent 12 — Reporting Agent (Gemini)
                        /gaps     ──► Agent 09 — Gap Analyst (Gemini)
                        /courses  ──► Agent 05 — Course Catalog
                        /help     ──► Agent 06 — Help
                        /onboard  ──► Agent 13 — Onboarding Agent (Gemini)  [own webhook]
                        /backup   ──► Agent 14 — Google Sheets Backup       [own webhook]
                                            │
                                            ▼
                                 Response via response_url
                                 or Slack Web API
```

**Stack:** Node.js 20 · Slack Bolt v3 · PostgreSQL 16 · Redis 7 · n8n · Gemini

---

## Agent Registry

| Agent | n8n Workflow ID | Triggered by |
|-------|----------------|--------------|
| Agent 02 — Quiz Master | `wpJOwdjIluP9n6Tu` | `/submit` |
| Agent 03 — Tutor | `e0yErInDqhfKbNls` | `/learn` |
| Agent 04 — Progress Tracker | `z8j0WZhQCfsduOdi` | `/progress` |
| Agent 05 — Course Catalog | supervisor route | `/courses` |
| Agent 06 — Help | supervisor route | `/help` |
| Agent 07 — Certification | `TcY8C8malQ5SiTqZ` | `/cert` |
| Agent 08 — Enrollment Manager | `BjxEx4DjqMwlkrU4` | `/enroll` |
| Agent 09 — Gap Analyst (Gemini) | `g5ZY673tbmDswpl4` | `/gaps` |
| Agent 10 — Unenroll | supervisor route | `/unenroll` |
| Agent 12 — Reporting Agent (Gemini) | `HpgyOs9wKZz2mAQd` | `/report` |
| Agent 13 — Onboarding Agent (Gemini) | `R8adLhGssCewBrKC` | `/onboard` |
| Agent 14 — Google Sheets Backup | `BackupToGSheets01` | `/backup` + nightly 2am UTC |

> n8n workflow source files are in `n8n/workflows/`. Import them via **n8n → Workflows → Import from file**.

---

## Slash Commands

| Command | Agent | Description |
|---------|-------|-------------|
| `/learn [lesson#]` | Tutor (03) | Resume (or jump to) a lesson |
| `/submit` | Quiz Master (02) | Complete the mission for the current module |
| `/progress` | Progress Tracker (04) | View your learning progress |
| `/enroll <course-code>` | Enrollment Manager (08) | Enrol in a course |
| `/unenroll <course-code>` | Unenroll (10) | Unenrol from a course |
| `/cert` | Certification (07) | Issue your certificate |
| `/report` | Reporting Agent (12) | LMS analytics dashboard (admins) |
| `/gaps` | Gap Analyst (09) | View stuck learners & hard modules (admins) |
| `/courses` | Course Catalog (05) | Browse available courses |
| `/help` | Help (06) | Show available commands |
| `/onboard` | Onboarding Agent (13) | Onboard a new employee |
| `/backup` | Backup (14) | Trigger manual backup to Google Sheets |

> `/learn` accepts an optional lesson number — e.g. `/learn 3` jumps directly to lesson 3.

---

## Quick Start (local dev)

```bash
# 1. Clone and install
git clone <repo-url> && cd RWRGroupSlackLMS
npm install

# 2. Configure environment
cp .env.example .env
# Fill in SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET, N8N_BASE_URL …

# 3. Start backing services + app (live-reload via override volumes)
docker compose up postgres redis -d
psql "$DATABASE_URL" -f db/schema.sql
npm run dev
```

Or run the full stack in Docker:

```bash
docker compose up --build
```

Health endpoint: `GET http://localhost:3000/health`

---

## Development

```bash
make test      # run Jest test suite
make lint      # ESLint
make format    # Prettier
make dev       # start with nodemon (hot-reload)
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for production deployment, Nginx setup, n8n workflow import, and upgrade procedures.

---

## Environment Variables

This repository uses the following **canonical env matrix** (derived from `src/index.js` startup validation and `src/services/n8n.js` runtime settings).

### Required at app startup

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

### Legacy / advanced n8n-only variables

The variables below are frequently used in standalone n8n deployments, but are **not required by this Node app startup validation** and **not directly consumed in `src/index.js` or `src/services/n8n.js`**:

- `N8N_HOST`, `N8N_PROTOCOL`, `WEBHOOK_URL`, `N8N_EDITOR_BASE_URL`, `N8N_SECURE_COOKIE`
- `DB_POSTGRESDB_*`, `QUEUE_BULL_REDIS_*`, and other n8n runtime infrastructure vars
- Notion/Gemini/Google/email credential variables used inside n8n workflow nodes

Use them only when your n8n hosting model requires them.

---

## Slack App Setup

Import `slack_manifest.json` into your Slack workspace:

1. Go to [api.slack.com/apps](https://api.slack.com/apps) → **Create New App** → **From a manifest**
2. Paste the contents of `slack_manifest.json`
3. Replace every `https://YOUR_APP_URL` placeholder with your public app URL
4. Install the app to your workspace and copy the bot token + signing secret into `.env`
