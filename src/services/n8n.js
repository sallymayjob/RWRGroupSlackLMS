/**
 * n8n forwarding service.
 *
 * Sends Slack payloads to the appropriate n8n webhook so the AI agents
 * can process them and respond via response_url or the Slack Web API.
 *
 * Routing (see n8n/workflows/supervisor-router.json for the full workflow):
 *
 *   supervisor  → POST /webhook/supervisor
 *                 Switch node dispatches by command to individual agents:
 *                   /learn    → Agent 03 — Tutor          (e0yErInDqhfKbMls)
 *                   /submit   → Agent 02 — Quiz Master    (wpJOwdjIluP9n6Tu)
 *                   /progress → Agent 04 — Progress       (z8j0WZhQCfsduOdi)
 *                   /enroll   → Agent 08 — Enrollment Mgr (BjxEx4DjqMwlkrU4)
 *                   /cert     → Agent 07 — Certification  (TcY8C8malQ5SiTqZ)
 *                   /report   → Agent 12 — Reporting      (HpgyOs9wKZz2mAQd)
 *                   /gaps     → Agent 09 — Gap Analyst     (g5ZY673tbmDswpl4)
 *
 *   onboard     → POST /webhook/onboard
 *                   /onboard  → Agent 13 — Onboarding     (R8adLhGssCewBrKC)
 *
 *   backup      → POST /webhook/backup
 *                   /backup   → Agent 14 — Google Sheets Backup (BackupToGSheets01)
 *
 *   slack-interactions → POST /webhook/slack-interactions
 *                   Block Kit button actions and modal submissions
 *
 *   slack-events → POST /webhook/slack/events
 *                   app_mention and message.im events
 *
 * Config (via .env):
 *   N8N_BASE_URL        — e.g. https://n8n.srv1371300.hstgr.cloud
 *   N8N_WEBHOOK_SECRET  — shared secret sent as X-Webhook-Secret header
 *   N8N_TIMEOUT_MS      — per-request timeout in ms (default: 2500)
 *   N8N_RETRY_LIMIT     — max retry attempts on 5xx/network error (default: 2)
 */

const ROUTES = {
  supervisor: "/webhook/supervisor",
  onboard: "/webhook/onboard",
  backup: "/webhook/backup",
  "slack-interactions": "/webhook/slack-interactions",
  "slack-events": "/webhook/slack/events",
};

const TIMEOUT_MS = parseInt(process.env.N8N_TIMEOUT_MS || "2500", 10);
const RETRY_LIMIT = parseInt(process.env.N8N_RETRY_LIMIT || "2", 10);

/**
 * Sleep for `ms` milliseconds.
 * @param {number} ms
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Forward a payload to an n8n workflow with timeout and retry.
 * @param {"supervisor"|"onboard"|"backup"|"slack-interactions"|"slack-events"} workflow
 * @param {object} payload
 */
async function forwardToN8n(workflow, payload) {
  const base = process.env.N8N_BASE_URL;
  if (!base) {
    console.warn("N8N_BASE_URL not set — skipping forward");
    return;
  }

  const route = ROUTES[workflow];
  if (!route) throw new Error(`Unknown n8n workflow: ${workflow}`);

  const url = `${base}${route}`;
  const headers = { "Content-Type": "application/json" };
  if (process.env.N8N_WEBHOOK_SECRET) {
    headers["X-Webhook-Secret"] = process.env.N8N_WEBHOOK_SECRET;
  }

  let lastError;
  for (let attempt = 0; attempt <= RETRY_LIMIT; attempt++) {
    if (attempt > 0) {
      await sleep(200 * attempt); // 200ms, 400ms backoff
    }

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (res.ok) return;

      // Retry on server errors; don't retry client errors
      if (res.status < 500) {
        console.error(`n8n ${workflow} responded ${res.status} — not retrying`);
        return;
      }

      lastError = new Error(`n8n ${workflow} responded ${res.status} ${res.statusText}`);
    } catch (err) {
      lastError = err.name === "AbortError"
        ? new Error(`n8n ${workflow} timed out after ${TIMEOUT_MS}ms`)
        : err;
    }

    console.warn(`n8n forward attempt ${attempt + 1} failed: ${lastError.message}`);
  }

  // All retries exhausted — log and surface the error to the caller
  console.error(`n8n forward to ${workflow} failed after ${RETRY_LIMIT + 1} attempts:`, lastError.message);
  throw lastError;
}

module.exports = { forwardToN8n };
