# RWRGroup Slack LMS — Technical Documentation

## 1. System Overview
RWRGroup Slack LMS is a Slack-first learning platform that combines:
- a Node.js Slack app (Bolt + Express receiver),
- PostgreSQL for learning data,
- Redis for cache/session support,
- n8n workflows for orchestration, AI-agent routing, proactive nudges, and backups.

Primary outcomes:
- deliver lessons in Slack,
- process submissions/progress/certifications,
- trigger proactive nudges,
- collect assignment proof via Slack modal,
- persist operational events for reporting and audit.

---

## 2. Architecture

### 2.1 Runtime Components
1. **Slack App (Node.js)**
   - Entry point: `src/index.js`
   - Registers command/event/interaction handlers.
   - Forwards payloads to n8n webhooks.

2. **n8n Workflows**
   - Supervisor router + specialized agent workflows (`n8n/workflows/*.json`).
   - Handles business logic, AI prompts, DB operations, and external integrations.

3. **PostgreSQL**
   - Stores users, enrolments, progress, notifications, nudge reactions, assignment submissions, audit data.

4. **Redis**
   - Caching and state-support service for low-latency interactions.

5. **Slack APIs**
   - Slash commands, event subscriptions, interactions, views API.

6. **Drive Save Endpoint (Webhook Contract)**
   - Assignment intake forwards normalized submission payload to `ASSIGNMENT_DRIVE_WEBHOOK_URL`.
   - Downstream service performs actual Drive upload and returns success/failure.

### 2.2 Message/Command Flow (High Level)
1. User sends slash command in Slack.
2. Node app `ack()` immediately.
3. Node app forwards command payload to n8n workflow endpoint.
4. n8n routes by command and executes agent logic.
5. Agent posts response via Slack response URL or Web API.

### 2.3 Proactive Nudge + Assignment Flow
1. Daily schedule triggers proactive nudge workflow.
2. Workflow selects inactive learners and excludes recently-reacted users.
3. Workflow sends interactive message with:
   - View Progress
   - Resume Lesson
   - Assignment (📝)
4. Assignment click opens Slack modal.
5. Modal collects assignment link + optional screenshot URL.
6. Intake workflow auto-generates file name, logs reaction/submission to DB, forwards payload to Drive webhook.

---

## 3. Code & Workflow Map

### 3.1 Node Service Files
- `src/index.js` — app startup, env validation, health endpoint, graceful shutdown.
- `src/services/n8n.js` — centralized webhook routing + retry/timeout.
- `src/handlers/commands.js` — slash command forwarding.
- `src/handlers/events.js` — event forwarding.
- `src/handlers/interactions.js` — interaction forwarding.
- `src/db.js`, `src/cache.js` — infrastructure connections.

### 3.2 n8n Workflows (Key)
- `supervisor-router.json` — command dispatch.
- `agent-02..14` — LMS agent-specific capabilities.
- `agent-11-proactive-nudge.json` — scheduled nudges + reaction-aware resend logic.
- `agent-15-assignment-intake.json` — assignment interaction + modal intake + persistence + Drive handoff.

---

## 4. Data Model Summary
Key tables include:
- `users`, `courses`, `modules`, `enrolments`, `progress`, `certificates`, `quiz_attempts`
- `notifications` (nudge send logs)
- `nudge_reactions` (reaction events)
- `assignment_submissions` (assignment proof metadata)
- `audit_log`, `course_tags`

### 4.1 Nudge Resend Policy
Current policy pattern:
- candidate learners: no module completion in last 3 days,
- resend allowed only when no reaction in `nudge_reactions` in last 24 hours.

---

## 5. Configuration

## 5.1 Core Environment Variables
- `SLACK_BOT_TOKEN`
- `SLACK_SIGNING_SECRET`
- `DATABASE_URL`
- `REDIS_URL`
- `PORT` (default `3000`)

## 5.2 n8n Service Variables
- `N8N_BASE_URL`
- `N8N_WEBHOOK_SECRET` (optional)
- `N8N_TIMEOUT_MS` (default fallback: `2500`)
- `N8N_RETRY_LIMIT` (default fallback: `2`)

## 5.3 Assignment/Integration Variables
- `ASSIGNMENT_DRIVE_WEBHOOK_URL`
- `GOOGLE_SHEETS_BACKUP_ID` (backup flow)
- `SLACK_ADMIN_WEBHOOK_URL` (backup notifications)

---

## 6. Testing Plan (Complete)

## 6.1 Objectives
- Validate routing and webhook forwarding behavior.
- Validate resilience (timeouts, retries, env parsing fallbacks).
- Validate workflow structure and required node contracts.
- Validate proactive nudge and assignment intake wiring.

## 6.2 Test Layers
1. **Unit Tests (Node Service)**
   - `tests/services/n8n.test.js`
   - Covers retry behavior, timeout fallback, env parsing, timer cleanup.

2. **Workflow Contract Tests (n8n JSON shape/spec)**
   - `tests/n8n/supervisor-router-workflow.test.js`
   - `tests/n8n/proactive-nudge-workflow.test.js`
   - `tests/n8n/assignment-intake-workflow.test.js`
   - Ensures critical node definitions, command literals, SQL clauses, action IDs, modal callbacks, persistence queries.

3. **Handler Tests (Slack app)**
   - `tests/handlers/*.test.js`
   - Confirms forwarding and handler behavior.

4. **Performance Smoke Test**
   - `tests/perf/load-100-users.test.js`
   - Validates bulk interaction simulation behavior.

## 6.3 Test Execution Commands
- Full suite:
  ```bash
  npm test -- --runInBand
  ```
- Focused n8n service:
  ```bash
  npm test -- tests/services/n8n.test.js --runInBand
  ```
- Focused workflow contracts:
  ```bash
  npm test -- tests/n8n/proactive-nudge-workflow.test.js tests/n8n/assignment-intake-workflow.test.js tests/n8n/supervisor-router-workflow.test.js --runInBand
  ```

## 6.4 Release Gate (Recommended)
A release should only proceed if all are true:
- All tests pass.
- Required environment variables are present and validated.
- DB schema migrations applied successfully.
- n8n workflows imported/activated correctly.
- Slack command and interaction smoke checks pass in staging.

---

## 7. Deployment Plan (End-User Ready)

For the current production runtime procedure, follow the canonical deployment guide: [`DEPLOYMENT.md`](../DEPLOYMENT.md).

## 7.1 Environments
- **Dev**: local docker-compose + sandbox Slack workspace.
- **Staging**: production-like infra, test Slack workspace, full integration validation.
- **Production**: customer-facing workspace and data.

## 7.2 Deployment Steps
1. **Pre-Deploy**
   - Pull latest code.
   - Verify env secrets and tokens.
   - Backup DB.

2. **Database**
   - Apply schema updates (`db/schema.sql`) in controlled migration process.
   - Verify new tables/indexes (`nudge_reactions`, `assignment_submissions`).

3. **Application Deploy**
   - Build and deploy Node service.
   - Verify health endpoint (`/health`).

4. **n8n Deploy**
   - Import/update workflows:
     - supervisor router
     - proactive nudge
     - assignment intake
   - Ensure webhook paths and credentials are valid.
   - Activate workflows intentionally (especially scheduled/interaction workflows).

5. **Slack Configuration**
   - Ensure slash commands and interaction request URL point to the correct environment.
   - Reinstall/update Slack app manifest if scopes or interactivity changed.

6. **Post-Deploy Validation**
   - Run command smoke tests (`/help`, `/learn`, `/progress`).
   - Trigger assignment button → modal submit path.
   - Confirm DB records inserted.
   - Confirm Drive webhook receives payload with auto filename.

7. **Rollback Plan**
   - Revert application to previous release image/tag.
   - Restore prior workflow versions in n8n.
   - If needed, rollback DB changes via migration rollback strategy or feature flag disablement.

---

## 8. Operational Runbook (User-End Reliability)

## 8.1 Daily Checks
- n8n executions for proactive nudge and assignment intake.
- Slack API error rate (chat.postMessage/views.open failures).
- DB insert health for nudge reactions and assignment submissions.

## 8.2 Alerts (Recommended)
- Zero nudge sends in expected window.
- Spike in interaction failures.
- Drive webhook non-2xx responses.
- DB connection errors.

## 8.3 Support Workflow
When users report issues:
1. Capture user ID, time, command/button used.
2. Check n8n execution logs for corresponding run.
3. Verify DB rows in `nudge_reactions` / `assignment_submissions`.
4. Verify downstream Drive webhook logs.
5. Replay/repair submission if required.

---

## 9. Security & Compliance Notes
- Validate Slack signatures for inbound webhook requests.
- Keep bot tokens and DB credentials in secret managers; never hardcode.
- Store only required assignment metadata (links/screenshots references).
- Use audit trails (`audit_log`, workflow execution logs) for support/compliance investigations.

---

## 10. Future Enhancements
- Native Google Drive node upload in n8n (remove dependency on external webhook).
- True Slack file upload ingestion path (file objects + secure fetch).
- Retry DLQ for failed Drive saves.
- Dashboards for reaction rate, submission SLA, and completion outcomes.
