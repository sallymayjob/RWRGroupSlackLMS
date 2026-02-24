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
