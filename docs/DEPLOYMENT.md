# Deployment Guide (Production)

## 1) Stack

- Node.js Slack ingress app
- n8n workflows (external or containerized)
- PostgreSQL
- Redis
- Traefik (reverse proxy)
- Docker Compose on Hostinger VPS

## 2) Directory conventions

- App runtime: `src/`
- Workflows: `workflows/n8n-export/`
- Docker assets: `infrastructure/docker/`
- Traefik config: `infrastructure/traefik/`
- Hostinger scripts: `infrastructure/hostinger/`

## 3) Environment bootstrap

```bash
cp .env.example .env
```

Set at minimum:
- `SLACK_BOT_TOKEN`
- `SLACK_SIGNING_SECRET`
- `N8N_BASE_URL`
- `DATABASE_URL`
- `REDIS_URL`
- `N8N_WEBHOOK_SECRET` (recommended/production)

## 4) Deploy

```bash
docker compose pull
docker compose up -d --build
```

or

```bash
bash infrastructure/hostinger/deploy.sh
```

## 5) Database

Use `db/schema.sql` for fresh bootstrap. Use `db/migrations/` for incremental upgrades.

```bash
npm run db:migrate
```

## 6) n8n workflows

Import all JSON from:
- `workflows/n8n-export/`

Keep snapshots in:
- `workflows/backup/`

## 7) Health checks

```bash
npm test
curl -sf http://localhost:3000/health
```

## 8) Security baseline

- Enforce HTTPS at Traefik
- Keep n8n behind authenticated ingress
- Rotate Slack and integration tokens regularly
- Avoid default DB credentials in production
