/**
 * Register Slack slash command listeners.
 * @param {import('@slack/bolt').App} app
 */
module.exports = function registerCommands(app) {
  // /lms — root command; show available actions
  app.command("/lms", async ({ command, ack, respond }) => {
    await ack();
    await respond({
      response_type: "ephemeral",
      text: "Welcome to RWRGroup LMS! Use `/lms help` to see available commands.",
    });
  });
};
