/**
 * Tests for the "Validate Slack Signature" Code node (Agent 14 — backup workflow).
 *
 * The test harness mimics the n8n Code node execution context:
 *   $input  — { first() → { json: <inputData> }, all() → [{ json: <inputData> }] }
 *   $env    — plain object standing in for n8n environment variables
 */
const crypto = require("crypto");
const { run } = require("../../n8n/code/validate-slack-signature");

// ── Test helpers ─────────────────────────────────────────────────────────────

/** Compute a valid Slack signature for the given arguments. */
function sign(secret, timestamp, rawBody) {
  const base = `v0:${timestamp}:${rawBody}`;
  const hmac = crypto.createHmac("sha256", secret).update(base).digest("hex");
  return `v0=${hmac}`;
}

/** Build a minimal n8n $input object from a plain JSON value. */
function makeInput(json) {
  return {
    first: () => ({ json }),
    all: () => [{ json }],
  };
}

/** Return a timestamp string that is within Slack's 5-minute validity window. */
function freshTimestamp() {
  return String(Math.floor(Date.now() / 1000));
}

// ── Constants ─────────────────────────────────────────────────────────────────

const SECRET = "test-signing-secret-abc123";
const RAW_BODY = "command=%2Fbackup&user_id=U123&response_url=https%3A%2F%2Fhooks.slack.com%2Fcommands%2Fabc";

// ── Valid signature ───────────────────────────────────────────────────────────

describe("Validate Slack Signature — valid requests", () => {
  it("returns valid:true for a correctly-signed fresh request", () => {
    const timestamp = freshTimestamp();
    const $input = makeInput({
      rawBody: RAW_BODY,
      headers: {
        "x-slack-request-timestamp": timestamp,
        "x-slack-signature": sign(SECRET, timestamp, RAW_BODY),
      },
      body: { user_id: "U123", response_url: "https://hooks.slack.com/commands/abc" },
    });

    const [result] = run({ $input, $env: { SLACK_SIGNING_SECRET: SECRET } });

    expect(result.json.valid).toBe(true);
  });

  it("passes body (containing user_id and response_url) through in the result", () => {
    const timestamp = freshTimestamp();
    const $input = makeInput({
      rawBody: RAW_BODY,
      headers: {
        "x-slack-request-timestamp": timestamp,
        "x-slack-signature": sign(SECRET, timestamp, RAW_BODY),
      },
      body: { user_id: "U999", response_url: "https://hooks.slack.com/commands/xyz" },
    });

    const [result] = run({ $input, $env: { SLACK_SIGNING_SECRET: SECRET } });

    // The full raw payload is spread into the result so downstream nodes can
    // access all webhook fields. user_id / response_url live under body.
    expect(result.json.body.user_id).toBe("U999");
    expect(result.json.body.response_url).toBe("https://hooks.slack.com/commands/xyz");
  });

  it("accepts an empty rawBody (no slash-command parameters)", () => {
    const timestamp = freshTimestamp();
    const $input = makeInput({
      rawBody: "",
      headers: {
        "x-slack-request-timestamp": timestamp,
        "x-slack-signature": sign(SECRET, timestamp, ""),
      },
      body: {},
    });

    const [result] = run({ $input, $env: { SLACK_SIGNING_SECRET: SECRET } });

    expect(result.json.valid).toBe(true);
  });
});

// ── Invalid signature ─────────────────────────────────────────────────────────

describe("Validate Slack Signature — tampered / wrong signature", () => {
  it("returns valid:false when the signature does not match the body", () => {
    const timestamp = freshTimestamp();
    // Sign a different body so the signature is wrong for RAW_BODY
    const wrongSig = sign(SECRET, timestamp, "different-body");
    const $input = makeInput({
      rawBody: RAW_BODY,
      headers: {
        "x-slack-request-timestamp": timestamp,
        "x-slack-signature": wrongSig,
      },
      body: {},
    });

    const [result] = run({ $input, $env: { SLACK_SIGNING_SECRET: SECRET } });

    expect(result.json.valid).toBe(false);
  });

  it("returns valid:false when the signing secret is wrong", () => {
    const timestamp = freshTimestamp();
    const $input = makeInput({
      rawBody: RAW_BODY,
      headers: {
        "x-slack-request-timestamp": timestamp,
        "x-slack-signature": sign("wrong-secret", timestamp, RAW_BODY),
      },
      body: {},
    });

    const [result] = run({ $input, $env: { SLACK_SIGNING_SECRET: SECRET } });

    expect(result.json.valid).toBe(false);
  });

  it("returns valid:false when the signature length differs (no timing attack surface)", () => {
    const timestamp = freshTimestamp();
    const $input = makeInput({
      rawBody: RAW_BODY,
      headers: {
        "x-slack-request-timestamp": timestamp,
        "x-slack-signature": "v0=short",
      },
      body: {},
    });

    const [result] = run({ $input, $env: { SLACK_SIGNING_SECRET: SECRET } });

    expect(result.json.valid).toBe(false);
  });
});

// ── Timestamp expiry ──────────────────────────────────────────────────────────

describe("Validate Slack Signature — timestamp checks", () => {
  it("returns valid:false with reason=timestamp_expired_or_missing for a stale timestamp (>5 min old)", () => {
    const staleTimestamp = String(Math.floor(Date.now() / 1000) - 400);
    const $input = makeInput({
      rawBody: RAW_BODY,
      headers: {
        "x-slack-request-timestamp": staleTimestamp,
        "x-slack-signature": sign(SECRET, staleTimestamp, RAW_BODY),
      },
      body: {},
    });

    const [result] = run({ $input, $env: { SLACK_SIGNING_SECRET: SECRET } });

    expect(result.json.valid).toBe(false);
    expect(result.json.reason).toBe("timestamp_expired_or_missing");
  });

  it("returns valid:false with reason=timestamp_expired_or_missing when the header is absent", () => {
    const $input = makeInput({
      rawBody: RAW_BODY,
      headers: { "x-slack-signature": "v0=anything" },
      body: {},
    });

    const [result] = run({ $input, $env: { SLACK_SIGNING_SECRET: SECRET } });

    expect(result.json.valid).toBe(false);
    expect(result.json.reason).toBe("timestamp_expired_or_missing");
  });
});

// ── Missing environment config ────────────────────────────────────────────────

describe("Validate Slack Signature — missing configuration", () => {
  it("returns valid:false with reason=signing_secret_not_configured when $env has no secret", () => {
    const timestamp = freshTimestamp();
    const $input = makeInput({
      rawBody: RAW_BODY,
      headers: {
        "x-slack-request-timestamp": timestamp,
        "x-slack-signature": sign(SECRET, timestamp, RAW_BODY),
      },
      body: {},
    });

    const [result] = run({ $input, $env: {} });

    expect(result.json.valid).toBe(false);
    expect(result.json.reason).toBe("signing_secret_not_configured");
  });
});

// ── Missing / partial $json fields ───────────────────────────────────────────

describe("Validate Slack Signature — defensive defaults", () => {
  it("body is undefined when not present in input (downstream must handle via $json.body?.user_id)", () => {
    const timestamp = freshTimestamp();
    const $input = makeInput({
      rawBody: RAW_BODY,
      headers: {
        "x-slack-request-timestamp": timestamp,
        "x-slack-signature": sign(SECRET, timestamp, RAW_BODY),
      },
      // no body key — the raw object is spread as-is; body is absent
    });

    const [result] = run({ $input, $env: { SLACK_SIGNING_SECRET: SECRET } });

    expect(result.json.valid).toBe(true);
    expect(result.json.body).toBeUndefined();
  });

  it("defaults rawBody to empty string when absent from $json", () => {
    const timestamp = freshTimestamp();
    // Sign with empty rawBody to match the default
    const $input = makeInput({
      headers: {
        "x-slack-request-timestamp": timestamp,
        "x-slack-signature": sign(SECRET, timestamp, ""),
      },
      body: {},
      // no rawBody key
    });

    const [result] = run({ $input, $env: { SLACK_SIGNING_SECRET: SECRET } });

    expect(result.json.valid).toBe(true);
  });
});
