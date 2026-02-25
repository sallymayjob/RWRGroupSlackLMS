describe("n8n service", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv, N8N_BASE_URL: "https://example.com" };
    global.fetch = jest.fn().mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    process.env = originalEnv;
    delete global.fetch;
  });

  it("POSTs to the supervisor endpoint for known workflows", async () => {
    const { forwardToN8n } = require("../../src/services/n8n");
    await forwardToN8n("supervisor", { command: "/learn" });

    expect(global.fetch).toHaveBeenCalledWith(
      "https://example.com/webhook/supervisor",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("POSTs to the onboard endpoint", async () => {
    const { forwardToN8n } = require("../../src/services/n8n");
    await forwardToN8n("onboard", { command: "/onboard" });

    expect(global.fetch).toHaveBeenCalledWith(
      "https://example.com/webhook/onboard",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("skips forwarding when N8N_BASE_URL is not set", async () => {
    delete process.env.N8N_BASE_URL;
    const { forwardToN8n } = require("../../src/services/n8n");
    await forwardToN8n("supervisor", {});
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("throws on unknown workflow", async () => {
    const { forwardToN8n } = require("../../src/services/n8n");
    await expect(forwardToN8n("unknown-workflow", {})).rejects.toThrow(
      "Unknown n8n workflow: unknown-workflow"
    );
  });

  it("normalises trailing slash in N8N_BASE_URL", async () => {
    process.env.N8N_BASE_URL = "https://example.com/";
    const { forwardToN8n } = require("../../src/services/n8n");
    await forwardToN8n("supervisor", { command: "/learn" });

    expect(global.fetch).toHaveBeenCalledWith(
      "https://example.com/webhook/supervisor",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("rejects non-http N8N_BASE_URL values", async () => {
    process.env.N8N_BASE_URL = "file:///tmp/n8n";
    const { forwardToN8n } = require("../../src/services/n8n");

    await expect(forwardToN8n("supervisor", {})).rejects.toThrow(
      "Invalid N8N_BASE_URL: Unsupported protocol for N8N_BASE_URL: file:"
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe("n8n service — regression", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    // Pin retry limit to 1 so retry tests stay fast (one backoff sleep only)
    process.env = {
      ...originalEnv,
      N8N_BASE_URL: "https://example.com",
      N8N_RETRY_LIMIT: "1",
    };
    global.fetch = jest.fn().mockResolvedValue({ ok: true });
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    process.env = originalEnv;
    delete global.fetch;
  });

  // ── Routing ───────────────────────────────────────────────────────────────

  it("POSTs to /webhook/backup", async () => {
    const { forwardToN8n } = require("../../src/services/n8n");
    const p = forwardToN8n("backup", { command: "/backup" });
    await jest.runAllTimersAsync();
    await p;
    expect(global.fetch).toHaveBeenCalledWith(
      "https://example.com/webhook/backup",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("POSTs to /webhook/slack-interactions", async () => {
    const { forwardToN8n } = require("../../src/services/n8n");
    const p = forwardToN8n("slack-interactions", { type: "action" });
    await jest.runAllTimersAsync();
    await p;
    expect(global.fetch).toHaveBeenCalledWith(
      "https://example.com/webhook/slack-interactions",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("POSTs to /webhook/slack/events", async () => {
    const { forwardToN8n } = require("../../src/services/n8n");
    const p = forwardToN8n("slack-events", { type: "app_mention" });
    await jest.runAllTimersAsync();
    await p;
    expect(global.fetch).toHaveBeenCalledWith(
      "https://example.com/webhook/slack/events",
      expect.objectContaining({ method: "POST" })
    );
  });

  // ── Request shape ─────────────────────────────────────────────────────────

  it("serialises the payload as a JSON body", async () => {
    const { forwardToN8n } = require("../../src/services/n8n");
    const payload = { command: "/learn", text: "3", user_id: "U123" };
    const p = forwardToN8n("supervisor", payload);
    await jest.runAllTimersAsync();
    await p;
    const [, options] = global.fetch.mock.calls[0];
    expect(JSON.parse(options.body)).toEqual(payload);
  });

  it("sets Content-Type: application/json", async () => {
    const { forwardToN8n } = require("../../src/services/n8n");
    const p = forwardToN8n("supervisor", {});
    await jest.runAllTimersAsync();
    await p;
    const [, options] = global.fetch.mock.calls[0];
    expect(options.headers["Content-Type"]).toBe("application/json");
  });

  it("sends X-Webhook-Secret header when N8N_WEBHOOK_SECRET is set", async () => {
    process.env.N8N_WEBHOOK_SECRET = "supersecret";
    const { forwardToN8n } = require("../../src/services/n8n");
    const p = forwardToN8n("supervisor", {});
    await jest.runAllTimersAsync();
    await p;
    const [, options] = global.fetch.mock.calls[0];
    expect(options.headers["X-Webhook-Secret"]).toBe("supersecret");
  });

  it("omits X-Webhook-Secret header when N8N_WEBHOOK_SECRET is not set", async () => {
    delete process.env.N8N_WEBHOOK_SECRET;
    const { forwardToN8n } = require("../../src/services/n8n");
    const p = forwardToN8n("supervisor", {});
    await jest.runAllTimersAsync();
    await p;
    const [, options] = global.fetch.mock.calls[0];
    expect(options.headers["X-Webhook-Secret"]).toBeUndefined();
  });

  // ── Retry logic ───────────────────────────────────────────────────────────

  it("retries once on 5xx and resolves when second attempt succeeds", async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: false, status: 503, statusText: "Service Unavailable" })
      .mockResolvedValueOnce({ ok: true });

    const { forwardToN8n } = require("../../src/services/n8n");
    const p = forwardToN8n("supervisor", {});
    await jest.runAllTimersAsync();
    await p;

    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it("does not retry on 4xx client errors", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      statusText: "Bad Request",
    });

    const { forwardToN8n } = require("../../src/services/n8n");
    const p = forwardToN8n("supervisor", {});
    await jest.runAllTimersAsync();
    await p;

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("throws after all retries are exhausted on persistent 5xx", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    });

    const { forwardToN8n } = require("../../src/services/n8n");
    // Attach rejection handler BEFORE advancing timers to avoid unhandledRejection
    const assertion = expect(forwardToN8n("supervisor", {})).rejects.toThrow("500");
    await jest.runAllTimersAsync();
    await assertion;
    // RETRY_LIMIT=1 → 2 total attempts (attempt 0 + attempt 1)
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it("falls back to default retry limit when N8N_RETRY_LIMIT is invalid", async () => {
    process.env.N8N_RETRY_LIMIT = "abc";
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    });

    const { forwardToN8n } = require("../../src/services/n8n");
    const assertion = expect(forwardToN8n("supervisor", {})).rejects.toThrow("500");
    await jest.runAllTimersAsync();
    await assertion;

    // default RETRY_LIMIT=2 → 3 total attempts
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it("falls back to default retry limit when N8N_RETRY_LIMIT is partially numeric", async () => {
    process.env.N8N_RETRY_LIMIT = "2abc";
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    });

    const { forwardToN8n } = require("../../src/services/n8n");
    const assertion = expect(forwardToN8n("supervisor", {})).rejects.toThrow("500");
    await jest.runAllTimersAsync();
    await assertion;

    // default RETRY_LIMIT=2 → 3 total attempts
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it("falls back to default retry limit when N8N_RETRY_LIMIT is negative", async () => {
    process.env.N8N_RETRY_LIMIT = "-1";
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    });

    const { forwardToN8n } = require("../../src/services/n8n");
    const assertion = expect(forwardToN8n("supervisor", {})).rejects.toThrow("500");
    await jest.runAllTimersAsync();
    await assertion;

    // default RETRY_LIMIT=2 → 3 total attempts
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it("uses zero retry limit when N8N_RETRY_LIMIT is 0", async () => {
    process.env.N8N_RETRY_LIMIT = "0";
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    });

    const { forwardToN8n } = require("../../src/services/n8n");
    const assertion = expect(forwardToN8n("supervisor", {})).rejects.toThrow("500");
    await jest.runAllTimersAsync();
    await assertion;

    // RETRY_LIMIT=0 → 1 total attempt
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("falls back to default timeout when N8N_TIMEOUT_MS is invalid", async () => {
    process.env.N8N_TIMEOUT_MS = "25ms";
    global.fetch = jest.fn().mockResolvedValue({ ok: true });

    const setTimeoutSpy = jest.spyOn(global, "setTimeout");
    try {
      const { forwardToN8n } = require("../../src/services/n8n");
      const p = forwardToN8n("supervisor", {});
      await jest.runAllTimersAsync();
      await p;

      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 2500);
    } finally {
      setTimeoutSpy.mockRestore();
    }
  });

  it("falls back to default timeout when N8N_TIMEOUT_MS is 0", async () => {
    process.env.N8N_TIMEOUT_MS = "0";
    global.fetch = jest.fn().mockResolvedValue({ ok: true });

    const setTimeoutSpy = jest.spyOn(global, "setTimeout");
    try {
      const { forwardToN8n } = require("../../src/services/n8n");
      const p = forwardToN8n("supervisor", {});
      await jest.runAllTimersAsync();
      await p;

      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 2500);
    } finally {
      setTimeoutSpy.mockRestore();
    }
  });

  it("clears timeout timer when fetch throws", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("n8n down"));
    const clearTimeoutSpy = jest.spyOn(global, "clearTimeout");

    try {
      const { forwardToN8n } = require("../../src/services/n8n");
      const assertion = expect(forwardToN8n("supervisor", {})).rejects.toThrow("n8n down");
      await jest.runAllTimersAsync();
      await assertion;

      // RETRY_LIMIT=1 → 2 attempts, and each attempt must clear its own timer.
      expect(clearTimeoutSpy).toHaveBeenCalledTimes(2);
    } finally {
      clearTimeoutSpy.mockRestore();
    }
  });

  it("throws when payload exceeds configured size limit", async () => {
    process.env.N8N_MAX_PAYLOAD_BYTES = "1024";
    const { forwardToN8n } = require("../../src/services/n8n");
    const bigPayload = { data: "x".repeat(1100) };

    await expect(forwardToN8n("supervisor", bigPayload)).rejects.toThrow(
      "Payload too large for n8n forwarding"
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("throws a clear error for non-serializable payloads", async () => {
    const { forwardToN8n } = require("../../src/services/n8n");
    const circular = {};
    circular.self = circular;

    await expect(forwardToN8n("supervisor", circular)).rejects.toThrow(
      "Failed to serialize payload for n8n forwarding"
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
