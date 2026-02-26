require('dotenv').config();

const { requiredEnv, appConfig } = require('./utils/configLoader');
const logger = require('./utils/logger');

// ── Startup environment validation ───────────────────────────────────────────
const REQUIRED_ENV = [
  'SLACK_BOT_TOKEN',
  'SLACK_SIGNING_SECRET',
  'DATABASE_URL',
  'REDIS_URL',
  'N8N_BASE_URL',
  'N8N_WEBHOOK_SECRET',
];
requiredEnv(REQUIRED_ENV);

const { App, ExpressReceiver } = require('@slack/bolt');
const db = require('./database/connectors/db');
const cache = require('./database/connectors/cache');
const slackService = require('./services/slackService');

const receiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

receiver.router.get('/health', (_req, res) => {
  res.json({ status: 'ok', ts: new Date().toISOString() });
});

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  receiver,
});

slackService.register(app);

const { port } = appConfig();

(async () => {
  try {
    await db.connect();
    await cache.connect();
    await app.start(port);
    logger.info(`RWRGroup Agentic LMS running on port ${port} (HTTP mode)`);
  } catch (err) {
    logger.error('Failed to start application:', err.message);
    process.exit(1);
  }
})();

async function shutdown(signal) {
  logger.info(`Received ${signal} — shutting down gracefully`);
  try {
    await app.stop();
    await db.disconnect();
    await cache.disconnect();
  } catch (err) {
    logger.error('Error during shutdown:', err.message);
  }
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
