jest.mock("../../src/services/n8n", () => ({ forwardToN8n: jest.fn() }));

describe("interactions handler", () => {
  let actionHandlers;
  let viewHandlers;
  let mockForward;

  beforeEach(() => {
    jest.resetModules();
    mockForward = jest.fn().mockResolvedValue(undefined);
    jest.mock("../../src/services/n8n", () => ({ forwardToN8n: mockForward }));
    actionHandlers = [];
    viewHandlers = [];
    const fakeApp = {
      action: (pattern, fn) => actionHandlers.push({ pattern, fn }),
      view: (pattern, fn) => viewHandlers.push({ pattern, fn }),
    };
    require("../../src/handlers/interactions")(fakeApp);
  });

  // ── Registration ──────────────────────────────────────────────────────────

  it("registers exactly one wildcard action listener", () => {
    expect(actionHandlers).toHaveLength(1);
    expect(actionHandlers[0].pattern).toEqual(/.*/);
  });

  it("registers exactly one wildcard view listener", () => {
    expect(viewHandlers).toHaveLength(1);
    expect(viewHandlers[0].pattern).toEqual(/.*/);
  });

  // ── Action handler behavior ───────────────────────────────────────────────

  it("action handler calls ack() before forwarding", async () => {
    const ack = jest.fn().mockResolvedValue(undefined);
    const action = { action_id: "btn_enroll", type: "button" };
    const body = { user: { id: "U123" } };
    await actionHandlers[0].fn({ action, body, ack });
    expect(ack).toHaveBeenCalledTimes(1);
  });

  it("action handler forwards to slack-interactions with type:action", async () => {
    const ack = jest.fn().mockResolvedValue(undefined);
    const action = { action_id: "btn_enroll", type: "button", value: "enroll_101" };
    const body = { user: { id: "U123" }, trigger_id: "T999" };
    await actionHandlers[0].fn({ action, body, ack });
    expect(mockForward).toHaveBeenCalledWith("slack-interactions", {
      type: "action",
      action,
      body,
    });
  });

  // ── View (modal) handler behavior ────────────────────────────────────────

  it("view handler calls ack() before forwarding", async () => {
    const ack = jest.fn().mockResolvedValue(undefined);
    const view = { callback_id: "enroll_modal", state: {} };
    const body = { user: { id: "U123" } };
    await viewHandlers[0].fn({ view, body, ack });
    expect(ack).toHaveBeenCalledTimes(1);
  });

  it("view handler forwards to slack-interactions with type:view_submission", async () => {
    const ack = jest.fn().mockResolvedValue(undefined);
    const view = { callback_id: "enroll_modal", state: { values: {} } };
    const body = { user: { id: "U456" }, trigger_id: "T888" };
    await viewHandlers[0].fn({ view, body, ack });
    expect(mockForward).toHaveBeenCalledWith("slack-interactions", {
      type: "view_submission",
      view,
      body,
    });
  });
});
