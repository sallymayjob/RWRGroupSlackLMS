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

---

## 9) Slack app — update manifest after deployment

Two features added since the initial release require the Slack app to be updated
before they will work in production.

### 9a) ✅ Reaction-based lesson completion

The bot now listens for a `white_check_mark` (✅) reaction on lesson messages to
mark a lesson complete and advance the learner to the next module.

**Required manifest changes** (already reflected in `slack_manifest.json`):

| Type | Value |
|------|-------|
| Bot OAuth scope | `reactions:read` |
| Bot event subscription | `reaction_added` |

**Steps to apply:**

1. Go to [api.slack.com/apps](https://api.slack.com/apps) and open the app.
2. **Option A — paste the manifest:**
   - Navigate to **App Manifest** in the left sidebar.
   - Replace the contents with `slack_manifest.json` from this repo.
   - Click **Save Changes**.
3. **Option B — manual:**
   - Go to **OAuth & Permissions → Scopes → Bot Token Scopes** and add `reactions:read`.
   - Go to **Event Subscriptions → Subscribe to bot events** and add `reaction_added`.
   - Click **Save Changes**.
4. Reinstall the app to the workspace (**Install App → Reinstall to Workspace**) so
   the updated OAuth scopes take effect.

> No code deployment or restart is needed — the handler is already in `src/slack/events/index.js`.

---

## 10) Bulk enrolment import

Use this after the initial DB migration to enrol a batch of learners at once from a CSV.

### CSV format

Create a CSV file with the following columns:

| Column | Required | Description |
|--------|----------|-------------|
| `slack_user_id` | Yes | Slack member ID, e.g. `U012AB3CD` |
| `slack_team_id` | Yes | Slack workspace ID, e.g. `T012AB3CD` |
| `course_code` | Yes | Must match an existing row in `courses.code` |
| `email` | No | Populates the user record (leave blank to skip) |
| `display_name` | No | Populates the user record (leave blank to skip) |

A ready-to-fill template is at `enrollments-template.csv` in the project root.

A user can appear on multiple rows to enrol them in several courses at once.

### Run the import

```bash
# Copy and fill in the template
cp enrollments-template.csv my-enrollments.csv

# Run the import (DATABASE_URL must be set in .env)
npm run enroll:import -- my-enrollments.csv
```

Sample output:

```
Enrolment import complete
  Users     : 5 created, 1 updated
  Enrolments: 6 enrolled, 1 already enrolled (skipped)
  Rows processed: 7
```

### Behaviour notes

- **Idempotent** — re-running with the same file is safe; already-enrolled users are
  counted as skipped, never duplicated.
- **User auto-creation** — if a `slack_user_id` doesn't exist in the DB yet, the user
  record is created automatically.
- **Starts at lesson 1** — `current_module_id` is set to the lowest-position module of
  the enrolled course.
- **Unknown course warning** — rows referencing a `course_code` that doesn't exist are
  logged as warnings and skipped; the rest of the import continues.
- **Atomic** — the entire import runs in one transaction; any unexpected error rolls
  everything back.
