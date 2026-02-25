const fs = require("fs");
const path = require("path");

describe("assignment intake workflow", () => {
  function loadWorkflow() {
    const filePath = path.join(__dirname, "../../n8n/workflows/agent-15-assignment-intake.json");
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  }

  it("opens a Slack modal when assignment icon action is clicked", () => {
    const workflow = loadWorkflow();
    const ifNode = workflow.nodes.find((node) => node.name === "Is Assignment Icon Click");
    const openModalNode = workflow.nodes.find((node) => node.name === "Open Assignment Modal");

    const conditions = ifNode.parameters.conditions.conditions;
    expect(conditions[0].rightValue).toBe("block_actions");
    expect(conditions[1].rightValue).toBe("nudge_assignment_icon");

    expect(openModalNode.parameters.url).toBe("https://slack.com/api/views.open");
    expect(openModalNode.parameters.body.view).toContain("assignment_submission_modal");
  });

  it("builds auto filename and forwards submission payload to drive webhook", () => {
    const workflow = loadWorkflow();
    const filenameNode = workflow.nodes.find((node) => node.name === "Build Auto Filename");
    const saveNode = workflow.nodes.find((node) => node.name === "Save To Drive Webhook");

    expect(filenameNode.parameters.jsCode).toContain("auto_filename");
    expect(filenameNode.parameters.jsCode).toContain("assignment_");
    expect(saveNode.parameters.url).toContain("ASSIGNMENT_DRIVE_WEBHOOK_URL");
  });
});
