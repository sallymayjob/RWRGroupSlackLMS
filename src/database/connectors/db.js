const { Pool } = require("pg");
const logger = require('../../utils/logger');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Surface idle client errors so the process doesn't crash silently
pool.on("error", (err) => {
  logger.error("Unexpected Postgres pool error:", err.message);
});

async function connect() {
  const client = await pool.connect();
  client.release();
  logger.info("Connected to Postgres");
}

async function query(text, params) {
  return pool.query(text, params);
}

async function disconnect() {
  await pool.end();
}

module.exports = { connect, query, pool, disconnect };
