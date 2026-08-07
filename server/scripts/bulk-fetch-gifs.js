// Pre-warms the GIF cache for as many not-yet-cached exercises as the remaining monthly
// RapidAPI quota safely allows, instead of waiting for real users to trigger each fetch one
// by one (see exerciseCatalog.js route for the lazy path this complements, not replaces —
// this script is just a bulk head start). Stops itself well short of the hard quota wall
// (a caller-supplied budget, never assumes the full remaining amount) and on the first sign
// of trouble (rate limit, upstream error) rather than pushing through and risking a mid-batch
// 429 storm. Re-runnable: always resumes from whatever's still uncached.
import 'dotenv/config';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../src/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GIF_DIR = path.join(__dirname, '..', 'uploads', 'exercise-gifs');
fs.mkdirSync(GIF_DIR, { recursive: true });

// Multiple keys = multiple separate free-tier quotas. Rotates to the next one the moment
// the current key gets rate-limited, instead of stopping — add more RAPIDAPI_KEY_N to the
// env as they show up and re-run; nothing else needs to change.
const RAPIDAPI_KEYS = [process.env.RAPIDAPI_KEY, process.env.RAPIDAPI_KEY_2, process.env.RAPIDAPI_KEY_3].filter(
  Boolean
);
const RAPIDAPI_HOST = 'exercisedb.p.rapidapi.com';
const BUDGET = Number(process.argv[2] ?? 500); // requests to spend this run, leaves headroom for real users
const DELAY_MS = 400; // spread requests out, don't burst

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  if (RAPIDAPI_KEYS.length === 0) throw new Error('Missing RAPIDAPI_KEY in server/.env');
  let keyIndex = 0;

  const [rows] = await pool.query(
    'SELECT id, external_id FROM exercise_catalog WHERE gif_cached = 0 ORDER BY id LIMIT ?',
    [BUDGET]
  );
  console.log(`${rows.length} uncached exercises queued (budget ${BUDGET}, ${RAPIDAPI_KEYS.length} key(s) available).`);

  let done = 0;
  let failed = 0;
  for (const row of rows) {
    let cached = false;
    while (!cached && keyIndex < RAPIDAPI_KEYS.length) {
      try {
        const res = await fetch(
          `https://${RAPIDAPI_HOST}/image?exerciseId=${row.external_id}&resolution=180`,
          { headers: { 'x-rapidapi-host': RAPIDAPI_HOST, 'x-rapidapi-key': RAPIDAPI_KEYS[keyIndex] } }
        );
        if (res.status === 429) {
          keyIndex++;
          console.warn(`Key ${keyIndex} rate limited — ${keyIndex < RAPIDAPI_KEYS.length ? 'rotating to next key.' : 'no keys left.'}`);
          continue;
        }
        if (!res.ok) {
          console.warn(`id ${row.id} (${row.external_id}): HTTP ${res.status}, skipping`);
          failed++;
          break;
        }
        const buffer = Buffer.from(await res.arrayBuffer());
        await fsp.writeFile(path.join(GIF_DIR, `${row.id}.gif`), buffer);
        await pool.query('UPDATE exercise_catalog SET gif_cached = 1 WHERE id = ?', [row.id]);
        done++;
        cached = true;
        if (done % 25 === 0) console.log(`${done}/${rows.length} cached...`);
      } catch (err) {
        console.warn(`id ${row.id}: ${err.message}, skipping`);
        failed++;
        break;
      }
    }
    if (keyIndex >= RAPIDAPI_KEYS.length) {
      console.warn('All keys exhausted — stopping here, safe to resume later.');
      break;
    }
    await sleep(DELAY_MS);
  }

  console.log(`Done. ${done} cached, ${failed} failed/skipped this run.`);
  await pool.end();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
