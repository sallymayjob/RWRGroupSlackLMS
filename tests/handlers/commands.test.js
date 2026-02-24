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
];

describe("commands handler", () => {
  let registered;

  beforeEach(() => {
    jest.resetModules();
    jest.mock("../../src/services/n8n", () => ({ forwardToN8n: jest.fn() }));
    registered = [];
    const fakeApp = { command: (name) => registered.push(name) };
    require("../../src/handlers/commands")(fakeApp);
  });

  it("registers all 8 slash commands", () => {
    expect(registered).toHaveLength(ALL_COMMANDS.length);
    ALL_COMMANDS.forEach((cmd) => expect(registered).toContain(cmd));
  });

  it.each(ALL_COMMANDS)("registers %s", (cmd) => {
    expect(registered).toContain(cmd);
  });
});
