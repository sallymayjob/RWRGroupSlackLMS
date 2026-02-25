require("dotenv").config();

// ── Startup environment validation ───────────────────────────────────────────
const REQUIRED_ENV = ["SLACK_BOT_TOKEN", "SLACK_SIGNING_SECRET", "DATABASE_URL", "REDIS_URL"];
const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`Missing required environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

const { App, ExpressReceiver } = require("@slack/bolt");
const db = require("./db");
const cache = require("./cache");

const receiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

// ── Health check endpoint (used by Docker and load balancers) ─────────────────
receiver.router.get("/health", (_req, res) => {
  res.json({ status: "ok", ts: new Date().toISOString() });
});

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  receiver,
});

// ── Register Slack handlers ───────────────────────────────────────────────────
require("./handlers/events")(app);
require("./handlers/commands")(app);
require("./handlers/interactions")(app);

// ── Boot ──────────────────────────────────────────────────────────────────────
const port = parseInt(process.env.PORT || "3000", 10);

(async () => {
  try {
    await db.connect();
    await cache.connect();
    await app.start(port);
    console.log(`RWRGroup Agentic LMS running on port ${port} (HTTP mode)`);
  } catch (err) {
    console.error("Failed to start application:", err.message);
    process.exit(1);
  }
})();

// ── Graceful shutdown ─────────────────────────────────────────────────────────
async function shutdown(signal) {
  console.log(`Received ${signal} — shutting down gracefully`);
  try {
    await app.stop();
    await db.disconnect();
    await cache.disconnect();
  } catch (err) {
    console.error("Error during shutdown:", err.message);
  }
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
