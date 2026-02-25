/**
 * Logic for the "Validate Slack Signature" Code node in Agent 14 (backup workflow).
 *
 * n8n context objects accepted:
 *   $input  — { first() → { json }, all() → [{ json }] }
 *   $env    — environment variables object (e.g. { SLACK_SIGNING_SECRET: '...' })
 *
 * Usage inside the n8n Code node:
 *   const { run } = require('./validate-slack-signature');
 *   return run({ $input, $env });
 *
 * Or inline (current n8n setup) — paste the body of run() directly.
 */
const crypto = require("crypto");

function run({ $input, $env }) {
  const raw = $input.first().json;
  const rawBody = raw.rawBody || "";
  const headers = raw.headers || {};
  const timestamp = String(headers["x-slack-request-timestamp"] || "");
  const slackSignature = String(headers["x-slack-signature"] || "");
  const signingSecret = String($env.SLACK_SIGNING_SECRET || "");
  const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 300;

  if (!timestamp || parseInt(timestamp, 10) < fiveMinutesAgo) {
    return [{ json: { valid: false, reason: "timestamp_expired_or_missing", ...raw } }];
  }

  if (!signingSecret) {
    return [{ json: { valid: false, reason: "signing_secret_not_configured", ...raw } }];
  }

  const baseString = `v0:${timestamp}:${rawBody}`;
  const hmac = crypto.createHmac("sha256", signingSecret).update(baseString).digest("hex");
  const computed = `v0=${hmac}`;

  let valid = false;
  try {
    const a = Buffer.from(computed, "utf8");
    const b = Buffer.from(slackSignature, "utf8");
    if (a.length === b.length) {
      valid = crypto.timingSafeEqual(a, b);
    }
  } catch (e) {
    valid = false;
  }

  const body = raw.body || {};
  return [{ json: { valid, response_url: body.response_url || "", user_id: body.user_id || "" } }];
}

module.exports = { run };
