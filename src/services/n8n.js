/**
 * n8n forwarding service.
 *
 * Sends Slack payloads to the appropriate n8n webhook so the AI agents
 * can process them and respond via response_url or the Slack Web API.
 *
 * Workflow endpoints (configured in .env):
 *   N8N_BASE_URL        — e.g. https://n8n.srv1371300.hstgr.cloud
 *   N8N_WEBHOOK_SECRET  — shared secret added as X-Webhook-Secret header
 */

const ROUTES = {
  supervisor: "/webhook/supervisor",
  onboard: "/webhook/onboard",
  "slack-interactions": "/webhook/slack-interactions",
  "slack-events": "/webhook/slack/events",
};

/**
 * Forward a payload to an n8n workflow.
 * @param {"supervisor"|"onboard"|"slack-interactions"|"slack-events"} workflow
 * @param {object} payload
 */
async function forwardToN8n(workflow, payload) {
  const base = process.env.N8N_BASE_URL;
  if (!base) {
    console.warn("N8N_BASE_URL not set — skipping forward");
    return;
  }

  const path = ROUTES[workflow];
  if (!path) throw new Error(`Unknown n8n workflow: ${workflow}`);

  const url = `${base}${path}`;
  const headers = { "Content-Type": "application/json" };
  if (process.env.N8N_WEBHOOK_SECRET) {
    headers["X-Webhook-Secret"] = process.env.N8N_WEBHOOK_SECRET;
  }

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    console.error(`n8n forward to ${workflow} failed: ${res.status} ${res.statusText}`);
  }
}

module.exports = { forwardToN8n };
