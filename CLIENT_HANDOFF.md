# Client Handoff — RWR Group Slack LMS

This document identifies everything included in the client handoff package and what each item is for.

---

## Handoff Package Summary

| Document | Audience | Purpose |
|----------|----------|---------|
| `docs/user-training-manual.md` | End users | Slash command reference for all learners |
| `docs/csv-analytics-dashboard-guide.md` | Admin / L&D team | Google Sheets analytics dashboard setup and use |
| `docs/CONTENT_ARCHITECT_MASTER_PROMPT.md` | Content team | Claude Project system prompt for the 13-agent content factory |
| `README.md` | All | Project overview, architecture, quick-start |
| `DEPLOYMENT.md` | Technical team | Full stack deployment (Docker Compose, reverse proxy, env) |
| `RUNBOOK.md` | Technical / ops | Day-to-day operations, incident playbooks, restart procedures |
| `SECURITY.md` | All | How to report vulnerabilities |
| `docs/ENVIRONMENT_SETUP.md` | Technical team | n8n environment configuration and workflow import steps |
| `docs/DEPLOYMENT.md` | Technical team | n8n workflow deployment supplement |
| `docs/SLACK_MANIFEST_INTEGRATION.md` | Technical team | Command → agent routing reference |
| `docs/DATABASE_SCHEMA.md` | Technical team | Dual-schema architecture and table reference |
| `docs/Slack lms architecture diagram.html` | All | Visual system architecture diagram |
| `slack_manifest.json` | Technical team | Slack app manifest — source of truth for commands and scopes |

---

## End-User Package (non-technical)

These three documents are the primary client-facing deliverables for the L&D and learner audience:

1. **`docs/user-training-manual.md`**
   - All 12 slash commands with usage examples
   - Error messages and troubleshooting tips
   - Designed for non-technical end users

2. **`docs/csv-analytics-dashboard-guide.md`**
   - Google Sheets dashboard blueprint
   - KPI formulas, chart configuration, daily auto-refresh setup
   - For L&D managers tracking learner progress

3. **`docs/CONTENT_ARCHITECT_MASTER_PROMPT.md`**
   - Full Claude Project system prompt for the content factory
   - Paste directly into Claude Project → Custom Instructions
   - Reference for uploading Brand Guidelines, ULC Template, Course Map, SOP-05, Prompt Library to the Claude knowledge base

---

## Technical / Ops Package

For the technical contact who will operate and maintain the system:

4. **`README.md`** — Start here; explains architecture, commands, infrastructure
5. **`DEPLOYMENT.md`** (root) — Full deployment guide with Docker Compose, env vars, health checks, SSL
6. **`RUNBOOK.md`** — Operational playbook: container restarts, log inspection, n8n workflow recovery, backup verification
7. **`docs/ENVIRONMENT_SETUP.md`** — n8n configuration, workflow import order, credential setup
8. **`docs/DEPLOYMENT.md`** — n8n-specific supplement (workflow import, cron jobs, data reliability)
9. **`docs/SLACK_MANIFEST_INTEGRATION.md`** — Command routing reference for debugging and extending the system
10. **`docs/DATABASE_SCHEMA.md`** — Dual-schema reference; required for any DB migrations or new queries
11. **`slack_manifest.json`** — Apply to the Slack app to register all 12 commands and correct OAuth scopes
12. **`SECURITY.md`** — Vulnerability disclosure policy

---

## Architecture Reference

13. **`docs/Slack lms architecture diagram.html`**
    - Open in any browser
    - Visual end-to-end system diagram: Slack → Node.js Bolt → n8n → Agents → PostgreSQL/Google Sheets

---

## Not Included in Handoff (Internal Only)

The following are internal development artefacts and are **not** for client delivery:

| Document | Reason |
|----------|--------|
| `CLAUDE.md` | AI assistant conventions for this codebase |
| `CONTRIBUTING.md` | Developer contribution guide |
| `CHANGELOG.md` | Internal version history |
| `docs/internal/CODE_REVIEW.md` | Build-time code review notes |
| `docs/internal/PRODUCTION_REVIEW.md` | Internal production readiness review |
| `docs/internal/SECURITY_REVIEW.md` | Internal security audit findings |
| `docs/Notion database critique redesign.HTML` | Internal Notion workspace critique |

---

## n8n Workflow Files

All workflow exports are in `n8n/workflows/`. These should be imported into the client's n8n instance following `docs/ENVIRONMENT_SETUP.md` section 3.

| File | Purpose |
|------|---------|
| `supervisor-router.json` | Central command router (all 10 supervisor commands) |
| `agent-02-quiz-master.json` | `/submit` — quiz submission |
| `agent-03-tutor.json` | `/learn` — lesson delivery |
| `agent-04-progress-tracker.json` | `/progress` — learner progress |
| `agent-05-course-catalog.json` | `/courses` — course listing |
| `agent-06-help.json` | `/help` — help dispatch |
| `agent-07-certification.json` | `/cert` — certification |
| `agent-08-enrollment-manager.json` | `/enroll` and `/unenroll` |
| `agent-09-gap-analyst.json` | `/gaps` — gap analysis (Gemini) |
| `agent-10-unenroll.json` | `/unenroll` handler |
| `agent-11-proactive-nudge.json` | Scheduled Mon–Fri 09:00 UTC nudge |
| `agent-12-reporting-agent.json` | `/report` — reporting (Gemini) |
| `agent-13-onboarding-agent.json` | `/onboard` — onboarding (Gemini) |
| `agent-14-backup-to-sheets.json` | `/backup` and nightly 2am UTC backup |
| `agent-15-assignment-intake.json` | Assignment intake |

---

## Delivery Notes

- All secrets (`.env`) must be provisioned by the client — no credentials are included in this repository.
- The client's technical contact should follow `DEPLOYMENT.md` → `docs/ENVIRONMENT_SETUP.md` in that order.
- After deployment, validate each of the 12 commands end-to-end in a staging Slack workspace before going live.
