require("dotenv").config();

const { App, ExpressReceiver } = require("@slack/bolt");
const db = require("./db");
const cache = require("./cache");

const receiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  receiver,
});

// Register handlers
require("./handlers/events")(app);
require("./handlers/commands")(app);
require("./handlers/interactions")(app);

(async () => {
  await db.connect();
  await cache.connect();

  const port = process.env.PORT || 3000;
  await app.start(port);
  console.log(`RWRGroup Agentic LMS running on port ${port} (HTTP mode)`);
})();
