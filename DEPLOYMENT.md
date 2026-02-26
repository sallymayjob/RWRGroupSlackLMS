# Deployment Documentation Index

This repository keeps **canonical deployment guidance under `docs/`**.

Use the following in order:

1. `docs/ENVIRONMENT_SETUP.md` — required credentials, environment variables, and n8n prerequisites.
2. `docs/DEPLOYMENT.md` — production deployment topology, workflow activation, hardening, and operations.
3. `docs/DATABASE_SCHEMA.md` — canonical runtime schema (`db/schema.sql`) and migration/versioning strategy (`db/migrations/`).

## Why this file exists

Historically this repository had overlapping deployment guides in multiple locations.
To remove ambiguity and keep documentation organized, this root file is now an index only.

## Quick production bootstrap

```bash
cp .env.example .env
# fill secrets
docker compose -f docker-compose.yml up --build -d
psql "$DATABASE_URL" -f db/schema.sql
```

Then finish Slack/n8n integration and hardening steps from `docs/DEPLOYMENT.md`.
