# Hostinger VPS Deployment

## Commands

```bash
cp .env.example .env
# fill secrets
docker compose up -d --build
```

Alternative helper:

```bash
bash infrastructure/hostinger/deploy.sh
```

Traefik sample config is under `infrastructure/traefik/traefik.yml`.
