/**
 * Register Slack event listeners.
 *
 * Handles:
 *   - app_mention  — when the bot is @mentioned in a channel
 *   - message.im   — direct messages sent to the bot
 *
 * Both event types are forwarded to the n8n supervisor workflow so the AI
 * agent can respond conversationally.
 *
 * @param {import('@slack/bolt').App} app
 */
const { forwardToN8n } = require("../services/n8n");

module.exports = function registerEvents(app) {
  // @mention in any channel
  app.event("app_mention", async ({ event, ack }) => {
    if (ack) await ack();
    await forwardToN8n("supervisor", { type: "app_mention", ...event });
  });

  // Direct messages to the bot
  app.event("message", async ({ event, ack }) => {
    if (ack) await ack();
    // Only handle DMs (channel_type === "im"), ignore bot messages
    if (event.channel_type !== "im" || event.bot_id) return;
    await forwardToN8n("supervisor", { type: "message.im", ...event });
  });
};
