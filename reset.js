const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function reset() {
  await pool.query('UPDATE "Product" SET "expectedQty" = NULL;');
  console.log("Reset all expectedQty to NULL");
  pool.end();
}

reset();
