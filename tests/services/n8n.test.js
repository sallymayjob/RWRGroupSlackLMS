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
});
