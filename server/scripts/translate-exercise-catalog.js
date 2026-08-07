// Translates each exercise's description + instructions into fr/es/it, leaving `name`
// (and body_part/equipment/target, which the client already displays via short static i18n
// labels rather than raw DB strings) in English on purpose -- exercise names are commonly
// kept in English/international form even in non-English fitness communities, and matching
// against the free-text names users type themselves (see constants/exerciseGuides.ts) only
// works if this catalog's own names stay stable.
//
// Uses Google Translate's free/unofficial web endpoint -- no API key, no signup, fine for a
// one-time batch job populating a cache, but not an official/rate-limit-guaranteed API. If it
// ever gets blocked or Google changes the endpoint, swap TRANSLATE_URL for a real provider
// (DeepL, Cloud Translate) — everything downstream (columns, server route, client) is
// provider-agnostic.
//
// Resumable: only processes rows still missing a given language's columns, so re-running
// after an interruption (or after a fresh sync adds new exercises) picks up where it left off.
import 'dotenv/config';
import { pool } from '../src/db.js';

const LANGS = ['fr', 'es', 'it'];
const DELAY_MS = 350; // stay well under any burst limit
// Pure digits/symbols, no dictionary words -- a lettered marker like "@@STEP@@" gets
// translated by the engine too (seen in testing: became "@@ÉTAPE@@" in French), which
// silently breaks the split since we'd then be searching for the original English marker.
const SEPARATOR = '\n[[[9182736455]]]\n';

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function translateBlock(text, targetLang) {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  // json[0] is an array of [translatedChunk, originalChunk, ...] -- Google splits long input
  // into its own chunks irrespective of our separator, so re-join before re-splitting on ours.
  return json[0].map((chunk) => chunk[0]).join('');
}

async function translateExercise(row, lang) {
  const instructions = JSON.parse(row.instructions ?? '[]');
  const description = row.description ?? '';
  const combined = [description, ...instructions].join(SEPARATOR);
  if (!combined.trim()) return { description: '', instructions: [] };

  const translated = await translateBlock(combined, lang);
  const marker = '[[[9182736455]]]';
  const finalParts = translated.split(marker).map((p) => p.replace(/^\n+|\n+$/g, '').trim());

  return {
    description: finalParts[0]?.trim() ?? description,
    instructions: finalParts.slice(1).map((s) => s.trim()).filter(Boolean),
  };
}

async function run() {
  const limit = Number(process.argv[2] ?? 5000);
  let totalDone = 0;

  for (const lang of LANGS) {
    const [rows] = await pool.query(
      `SELECT id, description, instructions FROM exercise_catalog
       WHERE description_${lang} IS NULL
       ORDER BY id LIMIT ?`,
      [limit]
    );
    console.log(`[${lang}] ${rows.length} exercises to translate`);

    let done = 0;
    for (const row of rows) {
      try {
        const { description, instructions } = await translateExercise(row, lang);
        await pool.query(
          `UPDATE exercise_catalog SET description_${lang} = ?, instructions_${lang} = ? WHERE id = ?`,
          [description, JSON.stringify(instructions), row.id]
        );
        done++;
        totalDone++;
        if (done % 50 === 0) console.log(`[${lang}] ${done}/${rows.length} done`);
      } catch (err) {
        console.warn(`[${lang}] id ${row.id} failed: ${err.message} -- will retry next run`);
      }
      await sleep(DELAY_MS);
    }
    console.log(`[${lang}] finished this run: ${done}/${rows.length}`);
  }

  console.log(`Done. ${totalDone} translations written this run.`);
  await pool.end();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
