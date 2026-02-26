# Slack App Integration

- Slash commands are registered in `src/slack/commands/index.js`.
- Events are handled in `src/slack/events/index.js`.
- Interactivity payloads are handled in `src/slack/handlers/interactions.js`.
- Slack signing secret is validated at ingress via Bolt `ExpressReceiver`.
