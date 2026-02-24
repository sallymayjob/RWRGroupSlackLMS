/**
 * Register Slack slash command listeners.
 *
 * All commands proxy payloads to the n8n supervisor workflow and return an
 * immediate ack() so Slack's 3-second window is always met. n8n sends the
 * actual response back via response_url.
 *
 * @param {import('@slack/bolt').App} app
 */
const { forwardToN8n } = require("../services/n8n");

module.exports = function registerCommands(app) {
  // /learn — resume the learner's next lesson
  app.command("/learn", async ({ command, ack }) => {
    await ack();
    await forwardToN8n("supervisor", command);
  });

  // /submit — complete mission for the current module
  app.command("/submit", async ({ command, ack }) => {
    await ack();
    await forwardToN8n("supervisor", command);
  });

  // /progress — view learning progress
  app.command("/progress", async ({ command, ack }) => {
    await ack();
    await forwardToN8n("supervisor", command);
  });

  // /enroll <course_id> — enroll in a course
  app.command("/enroll", async ({ command, ack }) => {
    await ack();
    await forwardToN8n("supervisor", command);
  });

  // /cert — issue a certificate
  app.command("/cert", async ({ command, ack }) => {
    await ack();
    await forwardToN8n("supervisor", command);
  });

  // /report — view LMS analytics dashboard
  app.command("/report", async ({ command, ack }) => {
    await ack();
    await forwardToN8n("supervisor", command);
  });

  // /gaps — show stuck learners & hard modules
  app.command("/gaps", async ({ command, ack }) => {
    await ack();
    await forwardToN8n("supervisor", command);
  });

  // /onboard — onboard new employees
  app.command("/onboard", async ({ command, ack }) => {
    await ack();
    await forwardToN8n("onboard", command);
  });
};
