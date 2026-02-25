const fs = require("fs");
const path = require("path");

describe("supervisor-router workflow", () => {
  function loadWorkflow() {
    const filePath = path.join(__dirname, "../../n8n/workflows/supervisor-router.json");
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  }

  it("has no orphan non-trigger nodes", () => {
    const workflow = loadWorkflow();
    const triggerTypes = new Set([
      "n8n-nodes-base.webhook",
      "n8n-nodes-base.manualTrigger",
      "n8n-nodes-base.scheduleTrigger",
      "n8n-nodes-base.workflowTrigger",
    ]);

    const nodes = workflow.nodes.map((node) => node.name);
    const incoming = new Map(nodes.map((name) => [name, 0]));

    Object.entries(workflow.connections || {}).forEach(([, connection]) => {
      (connection.main || []).forEach((branch) => {
        (branch || []).forEach((edge) => {
          if (incoming.has(edge.node)) {
            incoming.set(edge.node, incoming.get(edge.node) + 1);
          }
        });
      });
    });

    const orphan = workflow.nodes
      .filter((node) => !triggerTypes.has(node.type))
      .filter((node) => (incoming.get(node.name) || 0) === 0)
      .map((node) => node.name);

    expect(orphan).toEqual([]);
  });

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
