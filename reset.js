const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function reset() {
  await pool.query('UPDATE "Product" SET "qty" = NULL;');
  console.log("Reset all qty to NULL");
  pool.end();
}

reset();
