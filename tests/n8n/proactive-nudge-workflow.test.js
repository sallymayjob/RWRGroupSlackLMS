const fs = require("fs");
const path = require("path");

describe("proactive nudge workflow", () => {
  function loadWorkflow() {
    const filePath = path.join(__dirname, "../../n8n/workflows/agent-11-proactive-nudge.json");
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  }

  it("runs daily on weekdays and includes lesson_id in learner query", () => {
    const workflow = loadWorkflow();
    const trigger = workflow.nodes.find((node) => node.name === "Daily 9am Weekday Trigger");
    const queryNode = workflow.nodes.find((node) => node.name === "Get Stuck Learners");

    expect(trigger.parameters.rule.interval[0].expression).toBe("0 9 * * 1-5");
    expect(queryNode.parameters.query).toContain("e.current_module_id AS lesson_id");
  });

  it("re-sends only when there is no recent nudge reaction", () => {
    const workflow = loadWorkflow();
    const queryNode = workflow.nodes.find((node) => node.name === "Get Stuck Learners");

    expect(queryNode.parameters.query).toContain("FROM nudge_reactions nr");
    expect(queryNode.parameters.query).toContain("nr.reacted_at > NOW() - INTERVAL '24 hours'");
  });

  it("sends interactive progress/lesson reaction buttons with lesson id payload", () => {
    const workflow = loadWorkflow();
    const sendNode = workflow.nodes.find((node) => node.name === "Send DM Nudge");
    const blocks = sendNode.parameters.body.blocks;

    const actions = blocks.find((block) => block.type === "actions");
    expect(actions).toBeDefined();

    const actionIds = actions.elements.map((element) => element.action_id);
    expect(actionIds).toEqual(expect.arrayContaining(["nudge_view_progress", "nudge_resume_lesson"]));

    const resumeButton = actions.elements.find((element) => element.action_id === "nudge_resume_lesson");
    expect(resumeButton.value).toContain("lesson_id");
  });
  it("includes assignment action button for users who have not reacted", () => {
    const workflow = loadWorkflow();
    const sendNode = workflow.nodes.find((node) => node.name === "Send DM Nudge");
    const actions = sendNode.parameters.body.blocks.find((block) => block.type === "actions");

    const assignmentButton = actions.elements.find((element) => element.action_id === "nudge_assignment_icon");
    expect(assignmentButton).toBeDefined();
    expect(assignmentButton.text.text).toContain("Assignment");
    expect(assignmentButton.value).toContain("lesson_id");
  });

});
