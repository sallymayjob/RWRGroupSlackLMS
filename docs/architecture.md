# Slack LMS System Architecture

## Runtime flow

Slack User -> Slack App HTTP endpoint (`/slack/events`) -> Node.js Bolt handlers -> n8n webhook router -> agent workflows -> Postgres/Redis/Google Sheets.

## Components

- Slack ingress: `src/slack/*`
- n8n proxy: `src/services/n8nService.js`
- DB/cache connectors: `src/database/connectors/*`
- n8n workflow exports: `workflows/n8n-export/*`
- Infra definitions: `infrastructure/docker`, `infrastructure/traefik`, `infrastructure/hostinger`
