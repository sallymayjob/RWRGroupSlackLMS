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
