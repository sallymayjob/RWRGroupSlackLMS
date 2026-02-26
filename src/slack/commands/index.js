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
const logger = require('../../utils/logger');

/** Commands that route to the supervisor workflow */
const SUPERVISOR_COMMANDS = [
  "/learn",
  "/progress",
  "/enroll",
  "/unenroll",
  "/cert",
  "/report",
  "/gaps",
  "/courses",
  "/help",
];

// Lesson ID format: M01-W01-L01 through M12-W04-L06
const LESSON_ID_REGEX = /^M(0[1-9]|1[0-2])-W(0[1-4])-L(0[1-6])$/;

module.exports = function registerCommands(app) {
  // All supervisor commands share the same handling
  for (const cmd of SUPERVISOR_COMMANDS) {
    app.command(cmd, async ({ command, ack, respond }) => {
      await ack();
      try {
        await forwardToN8n("supervisor", command);
      } catch (err) {
        logger.error(`${cmd} forward to supervisor failed:`, err.message);
        await respond({
          response_type: 'ephemeral',
          text: ':warning: Something went wrong processing your request. Please try again in a moment. If this keeps happening, contact your administrator.',
        });
      }
    });
  }

  // /submit — extracted for lesson ID validation
  app.command('/submit', async ({ command, ack, respond }) => {
    await ack();

    const parts = (command.text || '').trim().split(/\s+/);
    const lessonId = parts[0];

    if (!lessonId || !LESSON_ID_REGEX.test(lessonId)) {
      await respond({
        response_type: 'ephemeral',
        text: ':x: Invalid lesson ID. Expected format: `/submit M03-W02-L04 complete`\nMonth: 01–12, Week: 01–04, Lesson: 01–06.',
      });
      return;
    }

    try {
      await forwardToN8n('supervisor', command);
    } catch (err) {
      logger.error('/submit forward to supervisor failed:', err.message);
      await respond({
        response_type: 'ephemeral',
        text: ':warning: Could not submit right now. Please try again in a moment.',
      });
    }
  });

  // /onboard routes to its own n8n workflow
  app.command("/onboard", async ({ command, ack, respond }) => {
    await ack();
    try {
      await forwardToN8n("onboard", command);
    } catch (err) {
      logger.error("/onboard forward to onboard workflow failed:", err.message);
      await respond({
        response_type: 'ephemeral',
        text: ':warning: Something went wrong processing your request. Please try again in a moment. If this keeps happening, contact your administrator.',
      });
    }
  });

  // /backup triggers the Google Sheets backup workflow; also runs on a nightly schedule
  app.command("/backup", async ({ command, ack, respond }) => {
    await ack();
    try {
      await forwardToN8n("backup", command);
    } catch (err) {
      logger.error("/backup forward to backup workflow failed:", err.message);
      await respond({
        response_type: 'ephemeral',
        text: ':warning: Something went wrong processing your request. Please try again in a moment. If this keeps happening, contact your administrator.',
      });
    }
  });
};
