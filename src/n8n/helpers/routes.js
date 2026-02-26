/**
 * Canonical n8n webhook route map.
 * Import this wherever routes are needed — never define routes inline.
 */
module.exports = {
  supervisor:             '/webhook/supervisor',
  onboard:                '/webhook/onboard',
  backup:                 '/webhook/backup',
  'slack-interactions':   '/webhook/slack-interactions',
  'slack-events':         '/webhook/slack/events',
};
