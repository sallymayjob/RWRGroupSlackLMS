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

## Post-deployment steps

### Update the Slack app manifest

After deploying, the Slack app must be updated to enable reaction-based lesson
completion (✅). See **§ 9** in `docs/DEPLOYMENT.md` for full steps. In brief:

1. Open [api.slack.com/apps](https://api.slack.com/apps) → your app → **App Manifest**.
2. Paste the contents of `slack_manifest.json`.
3. Save and reinstall the app to the workspace.

This enables the `reactions:read` scope and `reaction_added` event that let
learners react with ✅ to mark a lesson done.

### Bulk enrolment import

To enrol a batch of learners from a CSV:

```bash
cp enrollments-template.csv my-enrollments.csv
# fill in slack_user_id, slack_team_id, course_code (email and display_name are optional)
npm run enroll:import -- my-enrollments.csv
```

See **§ 10** in `docs/DEPLOYMENT.md` for the full CSV spec and behaviour notes.
