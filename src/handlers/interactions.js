/**
 * Register Slack interactivity listeners (Block Kit buttons, modals, etc.).
 *
 * All interaction payloads are forwarded to the n8n slack-interactions workflow.
 *
 * @param {import('@slack/bolt').App} app
 */
const { forwardToN8n } = require("../services/n8n");

module.exports = function registerInteractions(app) {
  // Block Kit button actions
  app.action(/.*/, async ({ action, body, ack }) => {
    await ack();
    await forwardToN8n("slack-interactions", { type: "action", action, body });
  });

  // Modal submissions
  app.view(/.*/, async ({ view, body, ack }) => {
    await ack();
    await forwardToN8n("slack-interactions", { type: "view_submission", view, body });
  });
};
