require("dotenv").config();

const { App } = require("@slack/bolt");
const db = require("./db");
const cache = require("./cache");

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
});

// Register event and command handlers
require("./handlers/events")(app);
require("./handlers/commands")(app);

(async () => {
  await db.connect();
  await cache.connect();

  await app.start();
  console.log(`RWRGroup Slack LMS running on port ${process.env.PORT || 3000}`);
})();
