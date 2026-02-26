# Slack Manifest Integration

This document is the authoritative reference for Slack command routing, aligning
`slack_manifest.json` (source of truth), `src/handlers/commands.js` (runtime routing),
and the n8n workflow map in `CLAUDE.md`.

---

## Manifest file

- `slack_manifest.json` (repository root)

---

## Slash commands — complete list

All commands registered in `slack_manifest.json` and handled in `src/handlers/commands.js`:

| Command | Route | n8n Agent | Purpose |
|---------|-------|-----------|---------|
| `/learn` | supervisor | Agent 03 — Tutor | Deliver next lesson |
| `/submit` | supervisor | Agent 02 — Quiz Master | Submit mission answer / progress lesson |
| `/progress` | supervisor | Agent 04 — Progress Tracker | Show learner completion status |
| `/enroll` | supervisor | Agent 08 — Enrollment Manager | Enroll in a course |
| `/unenroll` | supervisor | Agent 08 — Enrollment Manager | Remove enrollment from a course |
| `/cert` | supervisor | Agent 07 — Certification | Issue/check certificate |
| `/report` | supervisor | Agent 12 — Reporting Agent (Gemini) | LMS analytics dashboard |
| `/gaps` | supervisor | Agent 09 — Gap Analyst (Gemini) | Identify skill gaps / stuck learners |
| `/courses` | supervisor | supervisor (list lookup) | Browse available courses |
| `/help` | supervisor | supervisor (help dispatch) | Show available commands |
| `/onboard` | onboard | Agent 13 — Onboarding Agent (Gemini) | New employee onboarding flow |
| `/backup` | backup | Agent 14 — Google Sheets Backup | Trigger manual LMS data backup |

---

## Endpoint mapping

The Node.js Bolt app receives all requests at its configured `SLACK_REQUEST_URL`
(typically `https://<your-domain>/slack/events`) and forwards payloads to n8n:

| Route key | n8n webhook path | Used by |
|-----------|-----------------|---------|
| `supervisor` | `POST /webhook/supervisor` | All 10 supervisor commands |
| `onboard` | `POST /webhook/onboard` | `/onboard` |
| `backup` | `POST /webhook/backup` | `/backup` |

Events (`app_mention`, `message.im`) and interactions (Block Kit actions, modal submissions)
also arrive at `/slack/events` and are forwarded to the supervisor workflow.

---

## n8n routing detail

In `n8n/workflows/supervisor-router.json` the supervisor dispatches by command:

| Command(s) | n8n Workflow ID | Agent |
|-----------|----------------|-------|
| `/learn` | `e0yErInDqhfKbNls` | Agent 03 — Tutor |
| `/submit` | `wpJOwdjIluP9n6Tu` | Agent 02 — Quiz Master |
| `/progress` | `z8j0WZhQCfsduOdi` | Agent 04 — Progress Tracker |
| `/enroll`, `/unenroll` | `BjxEx4DjqMwlkrU4` | Agent 08 — Enrollment Manager |
| `/cert` | `TcY8C8malQ5SiTqZ` | Agent 07 — Certification |
| `/report` | `HpgyOs9wKZz2mAQd` | Agent 12 — Reporting (Gemini) |
| `/gaps` | `g5ZY673tbmDswpl4` | Agent 09 — Gap Analyst (Gemini) |
| `/courses`, `/help` | supervisor (inline) | General dispatch |

`/onboard` and `/backup` bypass the supervisor — they route directly to their own
dedicated n8n webhook endpoints.

The supervisor also extracts a `lesson` integer from `/learn <N>` text before dispatching.

---

## Notes

- There is no `/quiz` command. The submission command is `/submit`.
- `/progress` routes to Agent 04 (Progress Tracker); `/report` routes to Agent 12 (Reporting).
  These are distinct agents with different workflows and workflow IDs.
- `/unenroll` shares the enrollment manager agent with `/enroll`.
- Socket mode is disabled; all payloads arrive over HTTP.
