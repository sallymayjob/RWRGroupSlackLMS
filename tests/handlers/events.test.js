jest.mock("../../src/services/n8n", () => ({ forwardToN8n: jest.fn() }));

describe("events handler", () => {
  let registered;

  beforeEach(() => {
    jest.resetModules();
    jest.mock("../../src/services/n8n", () => ({ forwardToN8n: jest.fn() }));
    registered = [];
    const fakeApp = { event: (name) => registered.push(name) };
    require("../../src/handlers/events")(fakeApp);
  });

  it("registers app_mention event", () => {
    expect(registered).toContain("app_mention");
  });

  it("registers message event (handles message.im channel_type)", () => {
    expect(registered).toContain("message");
  });
});

describe("events handler — behavior", () => {
  let eventHandlers;
  let mockForward;

  beforeEach(() => {
    jest.resetModules();
    mockForward = jest.fn().mockResolvedValue(undefined);
    jest.mock("../../src/services/n8n", () => ({ forwardToN8n: mockForward }));
    eventHandlers = {};
    const fakeApp = { event: (name, fn) => { eventHandlers[name] = fn; } };
    require("../../src/handlers/events")(fakeApp);
  });

  it("app_mention forwards to supervisor with type:app_mention spread into payload", async () => {
    const event = { user: "U123", text: "hello bot", channel: "C999" };
    await eventHandlers["app_mention"]({ event });
    expect(mockForward).toHaveBeenCalledWith("supervisor", {
      type: "app_mention",
      ...event,
    });
  });

  it("DM (channel_type=im) forwards to supervisor with type:message.im", async () => {
    const event = { channel_type: "im", user: "U123", text: "hi" };
    await eventHandlers["message"]({ event });
    expect(mockForward).toHaveBeenCalledWith("supervisor", {
      type: "message.im",
      ...event,
    });
  });

  it("non-DM message (channel_type=channel) is ignored", async () => {
    const event = { channel_type: "channel", user: "U123", text: "hi" };
    await eventHandlers["message"]({ event });
    expect(mockForward).not.toHaveBeenCalled();
  });

  it("message from a bot (bot_id present) is ignored", async () => {
    const event = { channel_type: "im", bot_id: "B123", text: "bot reply" };
    await eventHandlers["message"]({ event });
    expect(mockForward).not.toHaveBeenCalled();
  });

  it("message with a subtype (e.g. message_changed) is ignored", async () => {
    const event = { channel_type: "im", subtype: "message_changed", text: "edited" };
    await eventHandlers["message"]({ event });
    expect(mockForward).not.toHaveBeenCalled();
  });

  it("app_mention swallows forwardToN8n errors", async () => {
    mockForward.mockRejectedValue(new Error("n8n down"));
    const event = { user: "U123", text: "hello" };
    await expect(eventHandlers["app_mention"]({ event })).resolves.toBeUndefined();
  });

  it("message.im swallows forwardToN8n errors", async () => {
    mockForward.mockRejectedValue(new Error("n8n down"));
    const event = { channel_type: "im", user: "U123", text: "hi" };
    await expect(eventHandlers["message"]({ event })).resolves.toBeUndefined();
  });
});
