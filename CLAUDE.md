# CLAUDE.md — RWRGroupSlackLMS

This file provides context and conventions for AI assistants (e.g., Claude Code) working on this repository.

---

## Project Overview

**RWRGroupSlackLMS** is a Learning Management System (LMS) integrated with Slack for the RWR Group organization. The project enables training delivery, progress tracking, and learning workflows surfaced directly through the Slack platform.

> **Status:** Active development. Core scaffolding is in place: Node.js 20, Slack Bolt (HTTP mode), PostgreSQL, Redis, and n8n AI agent integration.

---

## Repository Structure

```
RWRGroupSlackLMS/
├── src/
│   ├── index.js              # Entry point — Bolt HTTP app, startup validation, graceful shutdown
│   ├── db.js                 # PostgreSQL pool wrapper
│   ├── cache.js              # Redis client wrapper
│   ├── handlers/
│   │   ├── commands.js       # All 12 slash commands → n8n
│   │   ├── events.js         # app_mention, message.im → n8n
│   │   └── interactions.js   # Block Kit actions & modal submissions → n8n
│   └── services/
│       └── n8n.js            # Forwards payloads to n8n workflows (timeout + retry)
├── tests/                    # Jest unit tests mirroring src/
├── db/
│   └── schema.sql            # Initial database schema
├── .env.example              # Required environment variable template
├── .eslintrc.js              # ESLint config
├── .prettierrc               # Prettier config
├── jest.config.js            # Jest config
├── Dockerfile                # Node 20 Alpine, non-root user, health check
├── docker-compose.yml        # App + Postgres 16 + Redis 7
├── slack_manifest.json       # Slack app manifest (source of truth)
├── CLAUDE.md
├── SECURITY.md
└── README.md
```

---

## Development Workflow

### Branch Strategy

- **`master`** — stable production-ready code; do not push directly
- **Feature branches** — use `feature/<short-description>` naming
- **Claude branches** — AI-generated work uses `claude/<session-id>` naming (current convention)

Always develop on a feature branch and open a pull request to `master`.

### Commits

- Write clear, imperative commit messages: `Add Slack event handler for course enrollment`
- Keep commits focused and atomic — one logical change per commit
- Reference issue numbers when applicable: `Fix token refresh bug (#42)`

### Pull Requests

- Include a description of what changed and why
- All tests must pass before merging
- At least one human review is required before merge to `master`

---

## Environment Variables

Environment variables **must never be committed** to the repository. Use a `.env` file locally and maintain a `.env.example` template with placeholder values.

See `.env.example` for the full list. Required at startup (app exits with a clear error if missing):

```env
SLACK_BOT_TOKEN=        # xoxb-...
SLACK_SIGNING_SECRET=   # from Slack app settings

# n8n AI backend
N8N_BASE_URL=           # https://n8n.srv1371300.hstgr.cloud
N8N_WEBHOOK_SECRET=     # optional shared secret

# Database & cache
DATABASE_URL=           # postgresql://user:pass@host:5432/db
REDIS_URL=              # redis://host:6379
```

`SLACK_APP_TOKEN` is **not** needed — socket mode is disabled.

---

## Testing

- Write tests for all new features and bug fixes
- Place tests in the `tests/` directory, mirroring the `src/` structure
- All tests must pass before committing or opening a PR

When a test framework is configured, run tests with:
```bash
npm test        # or the equivalent for the chosen stack
```

---

## Code Conventions

### General

- Prefer clarity over cleverness — write code that is easy to read and understand
- Use consistent formatting; configure a linter/formatter (e.g., ESLint + Prettier for JS/TS) and commit the config
- Avoid committing commented-out code; delete it or open an issue instead
- Remove `console.log` debug statements before committing

### Security

- Never hard-code credentials, tokens, or secrets
- Validate and sanitize all input from Slack events and slash commands
- Follow the guidelines in [SECURITY.md](./SECURITY.md) for reporting vulnerabilities
- Use least-privilege principles for Slack bot scopes

### Slack Integration

- Handle Slack's 3-second response window for slash commands (use `response_url` for deferred replies)
- Always verify the Slack request signature before processing any incoming event
- Use Slack Block Kit for rich message formatting

---

## Key Files to Know

| File | Purpose |
|------|---------|
| `SECURITY.md` | Vulnerability reporting policy |
| `.env.example` | Environment variable template |
| `src/index.js` | App entry point — env validation, startup, health endpoint |
| `src/handlers/commands.js` | Slash command registration and n8n forwarding |
| `src/services/n8n.js` | Centralized n8n webhook routing with retry/timeout |
| `db/schema.sql` | Runtime PostgreSQL schema (users, enrolments, modules, progress, nudges, assignments) |
| `data/lms_database_schema.sql` | Content/operational schema (learners, lessons, lesson_progress, agent_audit_logs) |
| `slack_manifest.json` | Slack app manifest — source of truth for commands and scopes |
| `n8n/workflows/` | n8n workflow JSON exports — import via n8n UI |
| `docs/SLACK_MANIFEST_INTEGRATION.md` | Command → agent routing reference |
| `docs/DATABASE_SCHEMA.md` | Dual-schema reference and mapping guidance |

---

## Getting Started

1. Clone the repository.
2. Copy `.env.example` to `.env` and fill in credentials.
3. Install dependencies: `npm install`
4. Apply database schemas:
   ```bash
   psql "$DATABASE_URL" -f db/schema.sql
   psql "$DATABASE_URL" -f data/lms_database_schema.sql
   ```
5. Import n8n workflows from `n8n/workflows/` (see `docs/DEPLOYMENT.md` for import order).
6. Run the development server: `npm run dev`

---

## n8n Agent Map

All business logic lives in n8n. The supervisor router (`n8n/workflows/supervisor-router.json`) receives every Slack payload and dispatches to the correct agent workflow:

| Command | Agent | n8n Workflow ID | Route |
|---------|-------|----------------|-------|
| `/learn [lesson#]` | Agent 03 — Tutor | `e0yErInDqhfKbNls` | supervisor |
| `/submit` | Agent 02 — Quiz Master | `wpJOwdjIluP9n6Tu` | supervisor |
| `/progress` | Agent 04 — Progress Tracker | `z8j0WZhQCfsduOdi` | supervisor |
| `/enroll` | Agent 08 — Enrollment Manager | `BjxEx4DjqMwlkrU4` | supervisor |
| `/unenroll` | Agent 08 — Enrollment Manager | `BjxEx4DjqMwlkrU4` | supervisor |
| `/cert` | Agent 07 — Certification | `TcY8C8malQ5SiTqZ` | supervisor |
| `/report` | Agent 12 — Reporting Agent (Gemini) | `HpgyOs9wKZz2mAQd` | supervisor |
| `/gaps` | Agent 09 — Gap Analyst (Gemini) | `g5ZY673tbmDswpl4` | supervisor |
| `/courses` | supervisor (inline list lookup) | — | supervisor |
| `/help` | supervisor (inline help dispatch) | — | supervisor |
| `/onboard` | Agent 13 — Onboarding Agent (Gemini) | `R8adLhGssCewBrKC` | onboard |
| `/backup` | Agent 14 — Google Sheets Backup | `BackupToGSheets01` | backup |

The supervisor also extracts a `lesson` integer from `/learn <N>` text before dispatching.

Agent 14 (`/backup`) routes directly to the `backup` webhook — it bypasses the supervisor. It also has an independent nightly Schedule trigger (2am UTC). Required env vars: `GOOGLE_SHEETS_BACKUP_ID`, `SLACK_ADMIN_WEBHOOK_URL` (see `.env.example`). Credentials to configure in n8n: `LMS Postgres` (Postgres) and `Google Sheets (LMS Backup)` (Google Sheets OAuth2).

n8n workflow exports live in `n8n/workflows/`. Import them via **n8n → Workflows → Import from file**.

---

## Notes for AI Assistants

- **Stack is locked:** Node.js 20, Slack Bolt v3 (HTTP mode), PostgreSQL 16, Redis 7, n8n (Gemini agents).
- All Slack events and commands are forwarded to n8n via `src/services/n8n.js` — do not add business logic here; put it in n8n workflows.
- Slash commands must call `ack()` first; event handlers (`app.event`) do NOT have `ack()`.
- `src/index.js` validates required env vars at startup — add new required vars to the `REQUIRED_ENV` array there.
- Database schema lives in `db/schema.sql`. Add new tables there and keep it idempotent (`IF NOT EXISTS`).
- When adding a new n8n workflow, export it as JSON and place it in `n8n/workflows/` so it is version-controlled.
- Do not commit `.env` files, credentials, or secrets.
- When in doubt about project direction, surface questions rather than making large architectural decisions autonomously.
- Update this file when significant architectural decisions are made or the project structure changes materially.
