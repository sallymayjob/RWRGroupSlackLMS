const { createClient } = require("redis");

let client;

async function connect() {
  client = createClient({ url: process.env.REDIS_URL });
  client.on("error", (err) => console.error("Redis error:", err));
  await client.connect();
  console.log("Connected to Redis");
}

async function get(key) {
  return client.get(key);
}

async function set(key, value, ttlSeconds) {
  if (ttlSeconds) {
    return client.setEx(key, ttlSeconds, value);
  }
  return client.set(key, value);
}

async function del(key) {
  return client.del(key);
}

module.exports = { connect, get, set, del };
