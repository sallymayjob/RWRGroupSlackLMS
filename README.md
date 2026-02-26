# Slack LMS System (Production-Grade)

Slack LMS automation platform with Node.js Slack ingress, n8n orchestration, Postgres state, Redis cache, and VPS-ready Docker deployment.

## System Overview

This repository is organized for production operations, scaling, and maintainability across Slack app handlers, n8n workflow assets, and infrastructure automation.

## Architecture (text diagram)

```
Slack User
  -> Slack App (slash commands/events/interactions)
  -> Node.js Bolt server (`src/index.js`)
  -> Webhook proxy (`src/services/n8nService.js`)
  -> n8n workflows (`workflows/n8n-export/`)
  -> Postgres / Redis / external integrations
```

## Repository Structure

- `src/slack/` Slack handlers, commands, events, middleware.
- `src/n8n/` n8n helpers/webhook proxy modules.
- `src/services/` shared services (`slackService`, `n8nService`, `automationService`).
- `src/database/` schema copies and connectors.
- `workflows/n8n-export/` canonical workflow JSON exports.
- `workflows/backup/` workflow backup snapshots.
- `infrastructure/docker/` Docker assets.
- `infrastructure/traefik/` reverse proxy config.
- `infrastructure/hostinger/` VPS setup/deploy scripts.
- `docs/` architecture, Slack app, n8n integration, Hostinger deployment, troubleshooting.
- `archive/` archived/legacy artifacts.

## Setup

```bash
npm install
cp .env.example .env
# fill secrets
docker compose up -d --build
npm run db:migrate
npm start
```

## Hostinger Deployment

```bash
bash infrastructure/hostinger/deploy.sh
```

## Environment Variables

<!-- REQUIRED_ENV_VARS_START -->
Required at startup (app exits if missing):
- `NODE_ENV=production`
- `PORT=3000`
- `SLACK_BOT_TOKEN`
- `SLACK_SIGNING_SECRET`
- `N8N_BASE_URL`
- `N8N_WEBHOOK_SECRET`
- `DATABASE_URL`
- `REDIS_URL`
- `LOG_LEVEL=info`
<!-- REQUIRED_ENV_VARS_END -->

## Backup and Restore

- Backup workflows: `npm run workflows:backup`
- Apply schema baseline: `npm run db:migrate`
- Restore data from your managed Postgres backup process.

## Ops validation

```bash
npm test
curl -sf http://localhost:3000/health
```

## Canonical Deployment Docs

- `docs/deployment-hostinger.md`
- `docs/DEPLOYMENT.md`
- `docs/DATABASE_SCHEMA.md`
