jest.mock("../../src/services/n8nService", () => ({ forwardToN8n: jest.fn() }));

const ALL_COMMANDS = [
  "/learn",
  "/submit",
  "/progress",
  "/enroll",
  "/unenroll",
  "/cert",
  "/report",
  "/gaps",
  "/courses",
  "/help",
  "/onboard",
  "/backup",
];

// /submit has its own dedicated handler with validation — tested separately below
const SUPERVISOR_COMMANDS = ALL_COMMANDS.filter(
  (c) => c !== "/onboard" && c !== "/backup" && c !== "/submit"
);

describe("commands handler", () => {
  let registered;

  beforeEach(() => {
    jest.resetModules();
    jest.mock("../../src/services/n8nService", () => ({ forwardToN8n: jest.fn() }));
    registered = [];
    const fakeApp = { command: (name) => registered.push(name) };
    require("../../src/slack/commands")(fakeApp);
  });

  it("registers all 12 slash commands", () => {
    expect(registered).toHaveLength(ALL_COMMANDS.length);
    ALL_COMMANDS.forEach((cmd) => expect(registered).toContain(cmd));
  });

  it.each(ALL_COMMANDS)("registers %s", (cmd) => {
    expect(registered).toContain(cmd);
  });
});

describe("commands handler — behavior", () => {
  let handlers;
  let mockForward;

  beforeEach(() => {
    jest.resetModules();
    mockForward = jest.fn().mockResolvedValue(undefined);
    jest.mock("../../src/services/n8nService", () => ({ forwardToN8n: mockForward }));
    handlers = {};
    const fakeApp = { command: (name, fn) => { handlers[name] = fn; } };
    require("../../src/slack/commands")(fakeApp);
  });

  it.each(SUPERVISOR_COMMANDS)(
    "%s calls ack() then forwards to supervisor workflow",
    async (cmd) => {
      const ack = jest.fn().mockResolvedValue(undefined);
      const command = { command: cmd, text: "", user_id: "U123" };
      await handlers[cmd]({ command, ack });
      expect(ack).toHaveBeenCalledTimes(1);
      expect(mockForward).toHaveBeenCalledWith("supervisor", command);
    }
  );

  it("/onboard calls ack() then forwards to the onboard workflow", async () => {
    const ack = jest.fn().mockResolvedValue(undefined);
    const command = { command: "/onboard", text: "", user_id: "U123" };
    await handlers["/onboard"]({ command, ack });
    expect(ack).toHaveBeenCalledTimes(1);
    expect(mockForward).toHaveBeenCalledWith("onboard", command);
  });

  it("/backup calls ack() then forwards to the backup workflow", async () => {
    const ack = jest.fn().mockResolvedValue(undefined);
    const command = { command: "/backup", text: "", user_id: "U123" };
    await handlers["/backup"]({ command, ack });
    expect(ack).toHaveBeenCalledTimes(1);
    expect(mockForward).toHaveBeenCalledWith("backup", command);
  });

  it("/backup responds ephemerally and does not throw when forwardToN8n fails", async () => {
    mockForward.mockRejectedValue(new Error("n8n unreachable"));
    const ack = jest.fn().mockResolvedValue(undefined);
    const respond = jest.fn().mockResolvedValue(undefined);
    await expect(
      handlers["/backup"]({ command: { command: "/backup", text: "" }, ack, respond })
    ).resolves.toBeUndefined();
    expect(respond).toHaveBeenCalledWith(expect.objectContaining({ response_type: 'ephemeral' }));
  });

  it("responds ephemerally and does not propagate forwardToN8n errors to Bolt", async () => {
    mockForward.mockRejectedValue(new Error("n8n unreachable"));
    const ack = jest.fn().mockResolvedValue(undefined);
    const respond = jest.fn().mockResolvedValue(undefined);
    await expect(
      handlers["/learn"]({ command: { command: "/learn", text: "" }, ack, respond })
    ).resolves.toBeUndefined();
    expect(respond).toHaveBeenCalledWith(expect.objectContaining({ response_type: 'ephemeral' }));
  });

  it("calls ack() even when forwardToN8n is about to throw", async () => {
    mockForward.mockRejectedValue(new Error("n8n unreachable"));
    const ack = jest.fn().mockResolvedValue(undefined);
    const respond = jest.fn().mockResolvedValue(undefined);
    await handlers["/progress"]({ command: { command: "/progress", text: "" }, ack, respond });
    expect(ack).toHaveBeenCalledTimes(1);
  });

  // /submit — dedicated validation tests
  it("/submit with valid lesson ID calls ack() and forwards to supervisor", async () => {
    const ack = jest.fn().mockResolvedValue(undefined);
    const respond = jest.fn().mockResolvedValue(undefined);
    const command = { command: "/submit", text: "M03-W02-L04 complete", user_id: "U123" };
    await handlers["/submit"]({ command, ack, respond });
    expect(ack).toHaveBeenCalledTimes(1);
    expect(mockForward).toHaveBeenCalledWith("supervisor", command);
    expect(respond).not.toHaveBeenCalled();
  });

  it("/submit with invalid lesson ID responds ephemerally and does NOT call forwardToN8n", async () => {
    const ack = jest.fn().mockResolvedValue(undefined);
    const respond = jest.fn().mockResolvedValue(undefined);
    const command = { command: "/submit", text: "M99-W99-L99 complete", user_id: "U123" };
    await handlers["/submit"]({ command, ack, respond });
    expect(ack).toHaveBeenCalledTimes(1);
    expect(respond).toHaveBeenCalledWith(expect.objectContaining({ response_type: 'ephemeral' }));
    expect(mockForward).not.toHaveBeenCalled();
  });

  it("/submit with empty text responds ephemerally and does NOT call forwardToN8n", async () => {
    const ack = jest.fn().mockResolvedValue(undefined);
    const respond = jest.fn().mockResolvedValue(undefined);
    const command = { command: "/submit", text: "", user_id: "U123" };
    await handlers["/submit"]({ command, ack, respond });
    expect(ack).toHaveBeenCalledTimes(1);
    expect(respond).toHaveBeenCalledWith(expect.objectContaining({ response_type: 'ephemeral' }));
    expect(mockForward).not.toHaveBeenCalled();
  });
});
