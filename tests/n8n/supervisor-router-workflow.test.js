const fs = require("fs");
const path = require("path");

describe("supervisor-router workflow", () => {
  function loadWorkflow() {
    const filePath = path.join(__dirname, "../../n8n/workflows/supervisor-router.json");
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  }

  it("routes slash commands using exact command literals", () => {
    const workflow = loadWorkflow();
    const switchNode = workflow.nodes.find((node) => node.type === "n8n-nodes-base.switch");

    expect(switchNode).toBeDefined();

    const rules = switchNode.parameters.rules.values;
    const commandLiterals = rules
      .flatMap((rule) => rule.conditions?.conditions ?? [])
      .map((condition) => condition.leftValue)
      .filter((value) => typeof value === "string" && value.startsWith("/"));

    expect(commandLiterals).toEqual(expect.arrayContaining([
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
    ]));

    expect(commandLiterals).not.toContain("=/learn");
  });
});
