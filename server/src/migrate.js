import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function run() {
  const sqlPath = path.join(__dirname, '..', 'migrations', '001_init.sql');
  const sql = await fs.readFile(sqlPath, 'utf8');
  const statements = sql
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);

  const conn = await pool.getConnection();
  try {
    for (const statement of statements) {
      await conn.query(statement);
    }
    console.log(`Applied ${statements.length} migration statements.`);
  } finally {
    conn.release();
  }
  await pool.end();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
