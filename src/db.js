const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function connect() {
  const client = await pool.connect();
  client.release();
  console.log("Connected to Postgres");
}

async function query(text, params) {
  return pool.query(text, params);
}

module.exports = { connect, query };
