# Changelog

All notable changes to RWRGroup Agentic LMS are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versions follow [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

### Added
- `DEPLOYMENT.md` — full production install guide (prerequisites, Docker, Nginx, n8n import, upgrade, troubleshooting)
- `Makefile` — common dev/ops commands (`make dev`, `make test`, `make db-migrate`, etc.)
- `nginx/lms.conf` — production Nginx reverse proxy with rate limiting, TLS, and security headers
- `CONTRIBUTING.md` — branch strategy, commit conventions, PR process, n8n workflow versioning guide
- `RUNBOOK.md` — production operations playbook (incident response, backup restore, on-call steps)
- `CHANGELOG.md` — this file
- `.github/workflows/ci.yml` — GitHub Actions CI: lint + test on every push and PR
- `.github/PULL_REQUEST_TEMPLATE.md` — structured PR description template
- `.github/ISSUE_TEMPLATE/bug_report.md` — structured bug report template
- `.github/ISSUE_TEMPLATE/feature_request.md` — structured feature request template
- `scripts/setup.sh` — one-command first-time setup script
- `LICENSE` — proprietary licence

### Changed
- `README.md` — added missing commands (`/unenroll`, `/courses`, `/help`, `/backup`), missing agents (05, 06, 10, 14), corrected Node.js requirement to ≥ 20, added full environment variable table

---

## [0.1.0] — 2025-01-01

### Added
- Initial project scaffolding
- Node.js 20 + Slack Bolt v3 HTTP app (`src/index.js`)
- PostgreSQL pool wrapper (`src/db.js`)
- Redis client wrapper (`src/cache.js`)
- Slash command handlers for all 12 LMS commands (`src/handlers/commands.js`)
- Slack event handlers for `app_mention` and `message.im` (`src/handlers/events.js`)
- Block Kit interaction and modal submission handler (`src/handlers/interactions.js`)
- n8n forwarding service with timeout and retry (`src/services/n8n.js`)
- Database schema with 10 tables: `users`, `courses`, `modules`, `enrolments`, `progress`, `certificates`, `quiz_attempts`, `audit_log`, `notifications`, `course_tags` (`db/schema.sql`)
- 14 n8n agent workflow definitions in `n8n/workflows/`
- n8n Code node scripts (`n8n/code/`)
- Dockerfile (Node 20 Alpine, non-root user, health check)
- `docker-compose.yml` — production stack (app, Postgres 16, Redis 7, n8n)
- `docker-compose.override.yml` — dev overrides (source volume mounts)
- `slack_manifest.json` — Slack app manifest with all 12 slash commands
- Jest test suite mirroring `src/` structure
- ESLint + Prettier configuration
- `SECURITY.md` — vulnerability reporting policy
- `CLAUDE.md` — AI assistant conventions and architecture notes
