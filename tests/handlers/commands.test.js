jest.mock("../../src/services/n8n", () => ({ forwardToN8n: jest.fn() }));

const ALL_COMMANDS = [
  "/learn",
  "/submit",
  "/progress",
  "/enroll",
  "/cert",
  "/report",
  "/gaps",
  "/onboard",
  "/backup",
];

const SUPERVISOR_COMMANDS = ALL_COMMANDS.filter(
  (c) => c !== "/onboard" && c !== "/backup"
);

describe("commands handler", () => {
  let registered;

  beforeEach(() => {
    jest.resetModules();
    jest.mock("../../src/services/n8n", () => ({ forwardToN8n: jest.fn() }));
    registered = [];
    const fakeApp = { command: (name) => registered.push(name) };
    require("../../src/handlers/commands")(fakeApp);
  });

  it("registers all 9 slash commands", () => {
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
    jest.mock("../../src/services/n8n", () => ({ forwardToN8n: mockForward }));
    handlers = {};
    const fakeApp = { command: (name, fn) => { handlers[name] = fn; } };
    require("../../src/handlers/commands")(fakeApp);
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

  it("/backup swallows forwardToN8n errors", async () => {
    mockForward.mockRejectedValue(new Error("n8n unreachable"));
    const ack = jest.fn().mockResolvedValue(undefined);
    await expect(
      handlers["/backup"]({ command: { command: "/backup", text: "" }, ack })
    ).resolves.toBeUndefined();
  });

  it("swallows forwardToN8n errors — does not propagate to Bolt", async () => {
    mockForward.mockRejectedValue(new Error("n8n unreachable"));
    const ack = jest.fn().mockResolvedValue(undefined);
    await expect(
      handlers["/learn"]({ command: { command: "/learn", text: "" }, ack })
    ).resolves.toBeUndefined();
  });

  it("calls ack() even when forwardToN8n is about to throw", async () => {
    mockForward.mockRejectedValue(new Error("n8n unreachable"));
    const ack = jest.fn().mockResolvedValue(undefined);
    await handlers["/progress"]({ command: { command: "/progress", text: "" }, ack });
    expect(ack).toHaveBeenCalledTimes(1);
  });
});
