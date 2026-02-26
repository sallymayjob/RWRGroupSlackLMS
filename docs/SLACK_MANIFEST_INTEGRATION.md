# Slack Manifest Integration

This project is aligned to your provided Slack manifest.

## Imported manifest file
- `docs/slack_app_manifest.json`

## Endpoint mapping
- Supervisor commands (`/learn`, `/submit`, `/progress`, `/enroll`, `/unenroll`, `/cert`, `/report`, `/gaps`, `/courses`, `/help`) -> `POST /webhook/supervisor`
- Onboarding command (`/onboard`) -> `POST /webhook/onboard`
- Events -> `POST /webhook/slack/events`
- Interactivity -> `POST /webhook/slack-interactions`

## n8n routing alignment
In `src/handlers/commands.js` (source of truth):
- `/learn` -> supervisor workflow
- `/submit` -> supervisor workflow
- `/progress` and `/report` -> supervisor workflow
- `/enroll` and `/unenroll` -> supervisor workflow
- `/cert` -> supervisor workflow
- `/gaps` -> supervisor workflow
- `/courses` and `/help` -> supervisor workflow
- `/onboard` -> onboard workflow
- `/backup` -> backup workflow

Legacy compatibility aliases are handled only inside workflow router logic (not registered as Slack slash commands):
- `/quiz`, `/complete`, `/feedback`, `/tutor`
- Mapping location: `workflows/Router.json` (`Parse Slack Payload` node) and `workflows/slack_supervisor.workflow.json` (`Switch by Command` node for `/quiz`).
