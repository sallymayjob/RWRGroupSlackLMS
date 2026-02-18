# Slack Manifest Integration

This project is aligned to your provided Slack manifest.

## Imported manifest file
- `docs/slack_app_manifest.json`

## Endpoint mapping
- Supervisor commands (`/learn`, `/quiz`, `/progress`, `/enroll`, `/cert`, `/report`, `/gaps`) -> `POST /webhook/supervisor`
- Onboarding command (`/onboard`) -> `POST /webhook/onboard`
- Events -> `POST /webhook/slack/events`
- Interactivity -> `POST /webhook/slack-interactions`

## n8n routing alignment
In `workflows/slack_supervisor.workflow.json`:
- `/learn` -> agent 3 (Tutor)
- `/quiz` -> agent 2 (Quiz Master)
- `/progress` and `/report` -> agent 12 (Reporting)
- `/enroll` -> agent 8 (Enrollment)
- `/cert` -> agent 7 (Certification)
- `/gaps` -> agent 9 (Gap Analyst)

Legacy commands (`/submit`, `/complete`, `/feedback`, `/tutor`) are still accepted for backward compatibility.
