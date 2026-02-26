/**
 * Register Slack event listeners.
 *
 * Handles:
 *   - app_mention  — when the bot is @mentioned in a channel
 *   - message      — DMs sent to the bot (channel_type === "im")
 *
 * NOTE: Bolt event handlers do NOT receive ack() — only slash commands do.
 * Both events are forwarded to the n8n supervisor workflow.
 *
 * @param {import('@slack/bolt').App} app
 */
const { forwardToN8n } = require("../../services/n8nService");
const logger = require('../../utils/logger');

module.exports = function registerEvents(app) {
  // @mention in any channel
  app.event('app_mention', async ({ event, say }) => {
    try {
      await forwardToN8n('supervisor', { type: 'app_mention', ...event });
    } catch (err) {
      logger.error('app_mention forward failed:', err.message);
      await say('Sorry, I could not process that right now. Please try again shortly.');
    }
  });

  // Direct messages to the bot — filter out bot messages and non-DMs
  app.event('message', async ({ event, say }) => {
    if (event.channel_type !== 'im' || event.bot_id || event.subtype) return;
    try {
      await forwardToN8n('supervisor', { type: 'message.im', ...event });
    } catch (err) {
      logger.error('message.im forward failed:', err.message);
      await say('Sorry, I could not process that right now. Please try again shortly.');
    }
  });
};
