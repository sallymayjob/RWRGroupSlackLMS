# Slack Manifest Integration

This project is aligned to your provided Slack manifest.

## Imported manifest file
- `docs/slack_app_manifest.json`

## Endpoint mapping
- Supervisor commands (`/learn`, `/submit`, `/progress`, `/enroll`, `/unenroll`, `/cert`, `/report`, `/gaps`, `/courses`, `/help`) -> `POST /webhook/supervisor`
- Onboarding command (`/onboard`) -> `POST /webhook/onboard`
- Events -> `POST /webhook/slack/events`
- Interactivity -> `POST /webhook/slack-interactions`

## n8n workflow import path (canonical)
- Import workflows from `n8n/workflows/` only.
- Do not use legacy `workflows/*.workflow.json` files for new deployments.

## n8n routing alignment
In `n8n/workflows/supervisor-router.json`:
- `/learn` -> agent 3 (Tutor)
- `/quiz` -> agent 2 (Quiz Master)
- `/progress` and `/report` -> agent 12 (Reporting)
- `/enroll` -> agent 8 (Enrollment)
- `/cert` -> agent 7 (Certification)
- `/gaps` -> agent 9 (Gap Analyst)

Legacy compatibility aliases are handled only inside workflow router logic (not registered as Slack slash commands):
- `/quiz`, `/complete`, `/feedback`, `/tutor`
- Mapping location: `workflows/Router.json` (`Parse Slack Payload` node) and `workflows/slack_supervisor.workflow.json` (`Switch by Command` node for `/quiz`).
