# Deployment (Quick Reference)

Canonical deployment instructions are in `docs/DEPLOYMENT.md` and `docs/deployment-hostinger.md`.

## Quick Start

```bash
cp .env.example .env
# fill secrets
docker compose pull
docker compose up -d --build
npm run db:migrate
```

## Hostinger helper

```bash
bash infrastructure/hostinger/deploy.sh
```

## Required Environment Variables

<!-- REQUIRED_ENV_VARS_START -->
These must be set before starting the application:
- `SLACK_BOT_TOKEN`
- `SLACK_SIGNING_SECRET`
- `N8N_BASE_URL`
- `N8N_WEBHOOK_SECRET`
- `DATABASE_URL`
- `REDIS_URL`
<!-- REQUIRED_ENV_VARS_END -->
