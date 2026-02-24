/**
 * Register Slack event listeners.
 * @param {import('@slack/bolt').App} app
 */
module.exports = function registerEvents(app) {
  app.event("app_mention", async ({ event, say }) => {
    await say(`Hello <@${event.user}>! How can I help with your learning today?`);
  });
};
