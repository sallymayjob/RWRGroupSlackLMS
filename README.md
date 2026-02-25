# RWRGroup Agentic LMS

A Slack-integrated Learning Management System powered by AI agents (n8n) for the RWR Group organisation.

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
                        /onboard  ──► Agent 13 — Onboarding Agent (Gemini)
                        /enroll   ──► Agent 08 — Enrollment Manager
                        /progress ──► Agent 04 — Progress Tracker
                        /learn    ──► Agent 03 — Tutor
                        /submit   ──► Agent 02 — Quiz Master
                        /cert     ──► Agent 07 — Certification
                        /report   ──► Agent 12 — Reporting Agent (Gemini)
                        /gaps     ──► Agent 09 — Gap Analyst (Gemini)
                                            │
                                            ▼
                                 Response via response_url
                                 or Slack Web API
```

**Stack:** Node.js 20 · Slack Bolt · PostgreSQL 16 · Redis 7 · n8n · Gemini

## Agent Registry

| Agent | n8n Workflow ID | Triggered by |
|-------|----------------|--------------|
| Agent 02 — Quiz Master | `wpJOwdjIluP9n6Tu` | `/submit` |
| Agent 03 — Tutor | `e0yErInDqhfKbNls` | `/learn` |
| Agent 04 — Progress Tracker | `z8j0WZhQCfsduOdi` | `/progress` |
| Agent 07 — Certification | `TcY8C8malQ5SiTqZ` | `/cert` |
| Agent 08 — Enrollment Manager | `BjxEx4DjqMwlkrU4` | `/enroll` |
| Agent 09 — Gap Analyst (Gemini) | `g5ZY673tbmDswpl4` | `/gaps` |
| Agent 12 — Reporting Agent (Gemini) | `HpgyOs9wKZz2mAQd` | `/report` |
| Agent 13 — Onboarding Agent (Gemini) | `R8adLhGssCewBrKC` | `/onboard` |

> n8n workflow source files are in `n8n/workflows/`. Import them via **n8n → Workflows → Import from file**.

## Slash Commands

| Command | Agent | Description |
|---------|-------|-------------|
| `/learn [lesson#]` | Tutor (03) | Resume (or jump to) a lesson |
| `/submit` | Quiz Master (02) | Complete the mission for the current module |
| `/progress` | Progress Tracker (04) | View your learning progress |
| `/enroll <course-code>` | Enrollment Manager (08) | Enrol in a course |
| `/cert` | Certification (07) | Issue your certificate |
| `/report` | Reporting Agent (12) | LMS analytics dashboard (admins) |
| `/gaps` | Gap Analyst (09) | View stuck learners & hard modules (admins) |
| `/onboard` | Onboarding Agent (13) | Onboard a new employee |

> **Note:** `/learn` accepts an optional lesson number — e.g. `/learn 3` jumps directly to lesson 3. The n8n supervisor extracts this as the `lesson` field.

## Getting Started

### Prerequisites

- Node.js ≥ 18
- Docker + Docker Compose
- A Slack app created from `slack_manifest.json`

### Setup

```bash
# 1. Clone and install
git clone <repo-url>
cd RWRGroupSlackLMS
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your Slack credentials and n8n URL

# 3. Start services (Postgres + Redis)
docker compose up postgres redis -d

# 4. Apply database schema
psql "$DATABASE_URL" -f db/schema.sql

# 5. Run the app
npm run dev
```

### Docker (full stack)

```bash
docker compose up --build
```

Health check: `GET http://localhost:3000/health`

## Development

```bash
npm test          # run test suite
npm run lint      # ESLint
npm run format    # Prettier
```

## Environment Variables

See `.env.example` for the full list. Required at startup:

- `SLACK_BOT_TOKEN`
- `SLACK_SIGNING_SECRET`

## Slack App Setup

Import `slack_manifest.json` into your Slack workspace via **api.slack.com → Your Apps → Create New App → From a manifest**.

Update the webhook URLs in the manifest to point to your deployed app or n8n instance.
