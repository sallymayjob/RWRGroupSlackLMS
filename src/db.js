const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Surface idle client errors so the process doesn't crash silently
pool.on("error", (err) => {
  console.error("Unexpected Postgres pool error:", err.message);
});

async function connect() {
  const client = await pool.connect();
  client.release();
  console.log("Connected to Postgres");
}

async function query(text, params) {
  return pool.query(text, params);
}

module.exports = { connect, query, pool };
