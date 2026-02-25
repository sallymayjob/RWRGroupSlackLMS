# Runbook — RWRGroup Agentic LMS

This document is the on-call reference for the production system. It covers how to diagnose and recover from the most common failure modes.

---

## Table of Contents

1. [Quick Reference](#1-quick-reference)
2. [Health Checks](#2-health-checks)
3. [App is Down / Not Responding](#3-app-is-down--not-responding)
4. [Slack Commands Return No Response](#4-slack-commands-return-no-response)
5. [Slack Returns "dispatch_failed"](#5-slack-returns-dispatch_failed)
6. [Database Issues](#6-database-issues)
7. [Redis Issues](#7-redis-issues)
8. [n8n Issues](#8-n8n-issues)
9. [Google Sheets Backup Failures](#9-google-sheets-backup-failures)
10. [Restarting Services](#10-restarting-services)
11. [Viewing Logs](#11-viewing-logs)
12. [Rolling Back a Deploy](#12-rolling-back-a-deploy)
13. [Restoring from Backup](#13-restoring-from-backup)
14. [Scaling](#14-scaling)
15. [Emergency Contacts](#15-emergency-contacts)

---

## 1. Quick Reference

```bash
# Health
curl https://lms.example.com/health

# Container status
docker compose ps

# Stream all logs
docker compose logs -f

# Stream app logs only
docker compose logs -f app

# Restart app only
docker compose -f docker-compose.yml up --build -d app

# Postgres shell
make shell-db

# n8n URL (SSH tunnel if not publicly exposed)
ssh -L 5678:localhost:5678 user@your-server
# then open http://localhost:5678
```

---

## 2. Health Checks

### App health endpoint

```bash
curl -sf https://lms.example.com/health
# Expected: {"status":"ok","ts":"2025-01-01T00:00:00.000Z"}
```

### Container health

```bash
docker compose ps
# All containers should show: Status = Up (healthy)
```

If any container shows `unhealthy` or `Exit`, see the relevant section below.

---

## 3. App is Down / Not Responding

**Symptoms:** `/health` returns 5xx or times out; Slack shows "dispatch_failed".

**Steps:**

```bash
# 1. Check container status
docker compose ps

# 2. Check recent logs for crash reason
docker compose logs --tail 100 app

# 3. Check for missing environment variables
# App prints "Missing required environment variables: ..." on startup failure
docker compose logs app | grep -i "missing\|error\|ECONNREFUSED"

# 4. Restart the app
docker compose -f docker-compose.yml up --build -d app

# 5. Confirm health
sleep 5 && curl https://lms.example.com/health
```

**Common causes:**

| Log message | Fix |
|-------------|-----|
| `Missing required environment variables` | Add the listed vars to `.env` and restart |
| `ECONNREFUSED` to Postgres | Postgres container is not healthy — see §6 |
| `ECONNREFUSED` to Redis | Redis container is not healthy — see §7 |
| `Cannot find module` | Run `docker compose -f docker-compose.yml up --build -d app` to reinstall deps |

---

## 4. Slack Commands Return No Response

**Symptom:** The command is acknowledged (Slack spinner disappears) but the user never receives a message.

This means the app received and ack'd the event, but the n8n workflow did not send a reply.

**Steps:**

```bash
# 1. Check app logs — did it forward to n8n successfully?
docker compose logs --tail 50 app | grep -i "n8n\|forward\|error"
```

```
# 2. Open n8n Executions to find the failed run
# n8n → Executions → filter by Workflow → look for Error status
```

```bash
# 3. Check n8n is reachable from the app container
docker compose exec app wget -qO- http://n8n:5678/healthz
# Expected: {"status":"ok"}
```

**Common causes:**

| Cause | Fix |
|-------|-----|
| n8n workflow not activated | Open n8n → Workflows → activate the relevant workflow |
| n8n credential expired (Gemini / Google) | Re-authorise in n8n → Settings → Credentials |
| `N8N_BASE_URL` wrong in `.env` | Correct the URL and restart the app |
| `N8N_WEBHOOK_SECRET` mismatch | Ensure the secret matches the header auth value in n8n |
| Postgres error inside n8n | Check n8n execution details for the SQL error, then fix data or schema |
| `response_url` expired | Slack `response_url` tokens expire after 30 minutes; ask the user to retry |

---

## 5. Slack Returns "dispatch_failed"

**Symptom:** Slack shows "dispatch_failed" immediately when a command is run.

This means Slack could not reach the app at all — the app did not respond within 3 seconds.

**Steps:**

```bash
# 1. Check the app is up
curl https://lms.example.com/health

# 2. Check Nginx is running
sudo systemctl status nginx

# 3. Check Nginx config is valid after any changes
sudo nginx -t

# 4. Check TLS cert is not expired
sudo certbot certificates

# 5. Check the Slack app manifest has the correct URL
# api.slack.com → Your Apps → Event Subscriptions → Request URL
```

**TLS cert renewal:**

```bash
sudo certbot renew --nginx
sudo systemctl reload nginx
```

---

## 6. Database Issues

### Connection refused

```bash
# Check Postgres is healthy
docker compose ps postgres

# Restart Postgres
docker compose restart postgres

# Test connection
docker compose exec postgres pg_isready -U lms_user -d lms_db
```

### Disk full

```bash
# Check disk usage
df -h

# Check Postgres data volume size
docker system df -v | grep postgres
```

Free disk space or expand the volume before restarting.

### Corrupted container / data loss

Restore from the most recent backup — see §13.

### Apply schema (safe to re-run)

```bash
psql "$DATABASE_URL" -f db/schema.sql
# All statements are CREATE TABLE IF NOT EXISTS — no data is dropped
```

### Ad-hoc queries

```bash
make shell-db
# or
docker compose exec postgres psql -U lms_user -d lms_db
```

---

## 7. Redis Issues

Redis is used for session/rate-limit state. Loss of Redis data is non-critical (state rebuilds on next request).

```bash
# Check Redis is healthy
docker compose ps redis

# Restart Redis
docker compose restart redis

# Test connection
docker compose exec redis redis-cli ping
# Expected: PONG

# Check memory usage
docker compose exec redis redis-cli info memory | grep used_memory_human
```

---

## 8. n8n Issues

### n8n is unreachable

```bash
# Check the n8n container
docker compose ps n8n
docker compose logs --tail 50 n8n

# Restart n8n
docker compose restart n8n
```

### Workflow execution errors

1. Open the n8n UI (or SSH tunnel: `ssh -L 5678:localhost:5678 user@server`).
2. Go to **Executions** → select the failed run.
3. Click on the failing node to see the error message and input/output data.
4. Fix the issue in the workflow and re-run the execution using **Retry**.

### Re-importing a workflow after a bad change

```bash
# Export the last known-good version from git
git show HEAD:n8n/workflows/agent-03-tutor.json > /tmp/agent-03-tutor.json
# Then import via n8n UI → Workflows → Import from file
```

### n8n database (SQLite) corruption

n8n uses its own SQLite database inside the container volume. If n8n won't start:

```bash
# Backup the SQLite file
docker compose exec n8n cp /home/node/.n8n/database.sqlite /home/node/.n8n/database.sqlite.bak

# Restart n8n (it will re-initialise if the file is corrupt)
docker compose restart n8n

# If still failing, remove the corrupted database (this resets all executions/credentials)
# WARNING: credentials must be re-entered after this
docker compose stop n8n
docker compose run --rm n8n rm -f /home/node/.n8n/database.sqlite
docker compose up -d n8n
```

---

## 9. Google Sheets Backup Failures

Agent 14 runs at 2am UTC and can also be triggered via `/backup`.

**Steps:**

```bash
# 1. Check n8n execution log for Agent 14
# n8n → Executions → filter by "agent-14-backup-to-sheets"

# 2. Common errors:
```

| Error | Fix |
|-------|-----|
| `Google Sheets OAuth2 token expired` | Re-authorise in n8n → Settings → Credentials → `Google Sheets (LMS Backup)` |
| `Spreadsheet not found` | Verify `GOOGLE_SHEETS_BACKUP_ID` in `.env` is the correct sheet ID |
| Postgres query error | Run the query manually in `make shell-db` to identify the data issue |
| `SLACK_ADMIN_WEBHOOK_URL` not set | Add the variable to `.env` and restart the app |

**Trigger a manual backup:**

```bash
# In Slack, run:
/backup
```

---

## 10. Restarting Services

```bash
# Restart app only (fastest — no rebuild)
docker compose restart app

# Rebuild and restart app (after code/dep changes)
docker compose -f docker-compose.yml up --build -d app

# Restart all services
docker compose -f docker-compose.yml restart

# Full stop and start
docker compose -f docker-compose.yml down
docker compose -f docker-compose.yml up -d
```

---

## 11. Viewing Logs

```bash
# All services, last 100 lines
docker compose logs --tail 100

# App only, follow
docker compose logs -f app

# n8n only, last 50 lines
docker compose logs --tail 50 n8n

# Filter app logs for errors
docker compose logs app 2>&1 | grep -i error

# Filter for a specific Slack user ID
docker compose logs app 2>&1 | grep "U01XXXXXXX"
```

---

## 12. Rolling Back a Deploy

```bash
# Find the previous image tag or commit
git log --oneline -10

# Checkout the previous commit
git checkout <previous-commit-sha>

# Rebuild from that commit
docker compose -f docker-compose.yml up --build -d app

# Verify
curl https://lms.example.com/health
```

For n8n workflows, re-import the previous JSON from git (see §8).

---

## 13. Restoring from Backup

Agent 14 exports these tables to Google Sheets nightly at 2am UTC:
`users`, `courses`, `enrolments`, `progress`, `certificates`, `quiz_attempts`

**Restore procedure:**

1. Open the Google Sheet (`GOOGLE_SHEETS_BACKUP_ID`).
2. Select the tab for the table you need and export as CSV.
3. Open a Postgres shell: `make shell-db`
4. Use `\copy` to import the CSV:

```sql
-- Example: restore progress records from CSV
\copy progress (user_id, module_id, status, completed_at)
  FROM '/tmp/progress.csv'
  CSV HEADER;
```

5. Verify row counts match the CSV.

For a full database restore from a PostgreSQL dump (if taken separately):

```bash
# Stop the app to prevent writes during restore
docker compose stop app

# Restore
pg_restore -d "$DATABASE_URL" --clean /path/to/backup.dump

# Restart
docker compose -f docker-compose.yml up -d app
```

---

## 14. Scaling

The app is stateless (session state is in Redis). To handle higher Slack event volume:

1. Increase container resources in `docker-compose.yml`:
   ```yaml
   services:
     app:
       deploy:
         resources:
           limits:
             cpus: "2"
             memory: 512M
   ```
2. Adjust Nginx `limit_req_zone` burst size in `nginx/lms.conf` proportionally.
3. For Postgres, tune `max_connections` and add a connection pooler (e.g. PgBouncer) if needed.

---

## 15. Emergency Contacts

| Role | Contact |
|------|---------|
| App/infra owner | [fill in] |
| Slack workspace admin | [fill in] |
| n8n instance owner | [fill in] |
| Google Workspace admin (Sheets OAuth) | [fill in] |
