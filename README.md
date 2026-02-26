# RWRGroup Agentic LMS

A Slack-integrated Learning Management System powered by AI agents (n8n) for the RWR Group organisation.

> For full installation instructions see **[docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)**.

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

## Repository Organization

This repository is organized by runtime responsibility:

- `src/` — Node.js Slack Bolt app (entrypoint, handlers, DB/cache services).
- `db/` — deploy-time canonical schema (`db/schema.sql`) and versioned migrations (`db/migrations/`).
- `n8n/` — n8n workflow JSON + reusable Code-node scripts.
- `workflows/` — workflow export/import artifacts and payload examples.
- `docs/` — canonical operational documentation (deployment, environment setup, schema, security reviews).
- `tests/` — Jest unit/integration tests + Python QA regression/perf checks.
- `reports/` — generated benchmark/QA outputs.

### Canonical docs map

- Deployment: `docs/DEPLOYMENT.md`
- Environment setup: `docs/ENVIRONMENT_SETUP.md`
- Database schema governance: `docs/DATABASE_SCHEMA.md`
- Security posture/review: `docs/SECURITY_REVIEW.md`


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

See [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) for production deployment, Nginx setup, n8n workflow import, and upgrade procedures.

---

## Environment Variables

See `.env.example` for the full list. Required at startup (app exits with a clear error if any are missing):

| Variable | Description |
|----------|-------------|
| `SLACK_BOT_TOKEN` | `xoxb-…` bot token from Slack app settings |
| `SLACK_SIGNING_SECRET` | Signing secret from Slack app settings |
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `N8N_BASE_URL` | Base URL of your n8n instance |
| `N8N_WEBHOOK_SECRET` | Shared secret header for app→n8n webhook auth (strongly recommended; required in production) |
| `GOOGLE_SHEETS_BACKUP_ID` | Spreadsheet ID for Agent 14 backups |
| `SLACK_ADMIN_WEBHOOK_URL` | Incoming webhook for backup notifications |

---

## Slack App Setup

Import `slack_manifest.json` into your Slack workspace:

1. Go to [api.slack.com/apps](https://api.slack.com/apps) → **Create New App** → **From a manifest**
2. Paste the contents of `slack_manifest.json`
3. Replace every `https://YOUR_APP_URL` placeholder with your public app URL
4. Install the app to your workspace and copy the bot token + signing secret into `.env`
