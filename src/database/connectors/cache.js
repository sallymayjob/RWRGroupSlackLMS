const { createClient } = require("redis");

let client;

async function connect() {
  client = createClient({ url: process.env.REDIS_URL });
  client.on("error", (err) => console.error("Redis client error:", err));
  await client.connect();
  console.log("Connected to Redis");
}

function assertConnected() {
  if (!client || !client.isOpen) {
    throw new Error("Redis client is not connected. Call connect() first.");
  }
}

async function get(key) {
  assertConnected();
  return client.get(key);
}

async function set(key, value, ttlSeconds) {
  assertConnected();
  if (ttlSeconds) {
    return client.setEx(key, ttlSeconds, value);
  }
  return client.set(key, value);
}

async function del(key) {
  assertConnected();
  return client.del(key);
}

async function disconnect() {
  if (client && client.isOpen) {
    await client.quit();
  }
}

module.exports = { connect, get, set, del, disconnect };
