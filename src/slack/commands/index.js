/**
 * Register Slack slash command listeners.
 *
 * ack() is called immediately so Slack's 3-second window is always met.
 * The payload is then forwarded to the appropriate n8n workflow; n8n
 * sends the actual response back via response_url.
 *
 * @param {import('@slack/bolt').App} app
 */
const { forwardToN8n } = require("../../services/n8nService");

/** Commands that route to the supervisor workflow */
const SUPERVISOR_COMMANDS = [
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
];

module.exports = function registerCommands(app) {
  // All supervisor commands share the same handling
  for (const cmd of SUPERVISOR_COMMANDS) {
    app.command(cmd, async ({ command, ack }) => {
      await ack();
      try {
        await forwardToN8n("supervisor", command);
      } catch (err) {
        console.error(`${cmd} forward to supervisor failed:`, err.message);
      }
    });
  }

  // /onboard routes to its own n8n workflow
  app.command("/onboard", async ({ command, ack }) => {
    await ack();
    try {
      await forwardToN8n("onboard", command);
    } catch (err) {
      console.error("/onboard forward to onboard workflow failed:", err.message);
    }
  });

  // /backup triggers the Google Sheets backup workflow; also runs on a nightly schedule
  app.command("/backup", async ({ command, ack }) => {
    await ack();
    try {
      await forwardToN8n("backup", command);
    } catch (err) {
      console.error("/backup forward to backup workflow failed:", err.message);
    }
  });
};
