// One-off (re-runnable) sync of ExerciseDB's text catalog into our own DB, so the app never
// depends on RapidAPI or its quota at request time — only this script calls RapidAPI, once
// per run, and only for the list endpoints (cheap: ~10 exercises/page, no way to raise page
// size on the free plan). GIFs are NOT fetched here — those are cached lazily on first view
// by the server route itself, since eagerly pulling ~1300 images would blow the whole
// 690-req/month free-tier quota in one shot. Safe to re-run periodically to pick up new
// entries; upserts by external_id so it never duplicates.
import 'dotenv/config';
import { pool } from '../src/db.js';

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const HOST = 'exercisedb.p.rapidapi.com';
const PAGE_SIZE = 10; // the API ignores a larger `limit` on the free plan — fixed page size
const MAX_OFFSET = 3000; // safety cap so a bug can't loop forever / burn the whole quota

async function fetchPage(offset) {
  const res = await fetch(`https://${HOST}/exercises?offset=${offset}&limit=${PAGE_SIZE}`, {
    headers: { 'x-rapidapi-host': HOST, 'x-rapidapi-key': RAPIDAPI_KEY },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} at offset ${offset}`);
  return res.json();
}

async function upsert(ex) {
  await pool.query(
    `INSERT INTO exercise_catalog
       (external_id, name, body_part, equipment, target, secondary_muscles, instructions, description, difficulty, category)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       name = VALUES(name), body_part = VALUES(body_part), equipment = VALUES(equipment),
       target = VALUES(target), secondary_muscles = VALUES(secondary_muscles),
       instructions = VALUES(instructions), description = VALUES(description),
       difficulty = VALUES(difficulty), category = VALUES(category)`,
    [
      ex.id,
      ex.name,
      ex.bodyPart,
      ex.equipment,
      ex.target,
      JSON.stringify(ex.secondaryMuscles ?? []),
      JSON.stringify(ex.instructions ?? []),
      ex.description ?? null,
      ex.difficulty ?? null,
      ex.category ?? null,
    ]
  );
}

async function run() {
  if (!RAPIDAPI_KEY) throw new Error('Missing RAPIDAPI_KEY in server/.env');
  let offset = 0;
  let total = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (offset > MAX_OFFSET) {
      console.warn(`Hit safety cap at offset ${offset}, stopping.`);
      break;
    }
    const page = await fetchPage(offset);
    if (!Array.isArray(page) || page.length === 0) break;
    for (const ex of page) await upsert(ex);
    total += page.length;
    console.log(`Synced offset ${offset} (+${page.length}, total ${total})`);
    offset += PAGE_SIZE;
    if (page.length < PAGE_SIZE) break; // last page
  }
  console.log(`Done. ${total} exercises synced.`);
  await pool.end();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
