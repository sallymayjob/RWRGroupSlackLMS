# RWRGroup Agentic LMS

A Slack-integrated Learning Management System powered by AI agents (n8n) for the RWR Group organisation.

## Architecture

```
Slack user
    │  slash command / DM / @mention
    ▼
Slack API ──► This app (Bolt HTTP, port 3000)
                  │  signature verified
                  │  ack() sent immediately (< 3s)
                  ▼
              n8n AI workflows
                  │  supervisor / onboard / interactions
                  ▼
              Response via response_url or Slack Web API
```

**Stack:** Node.js 20 · Slack Bolt · PostgreSQL 16 · Redis 7 · n8n

## Slash Commands

| Command | Description |
|---------|-------------|
| `/learn` | Resume your next lesson |
| `/submit` | Complete the mission for the current module |
| `/progress` | View your learning progress |
| `/enroll <course-code>` | Enrol in a course |
| `/cert` | Issue your certificate |
| `/report` | LMS analytics dashboard (admins) |
| `/gaps` | View stuck learners & hard modules (admins) |
| `/onboard` | Onboard a new employee |

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
