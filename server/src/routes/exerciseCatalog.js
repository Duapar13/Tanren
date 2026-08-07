import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GIF_DIR = path.join(__dirname, '..', '..', 'uploads', 'exercise-gifs');
fs.mkdirSync(GIF_DIR, { recursive: true });

// Same rotation strategy as scripts/bulk-fetch-gifs.js — several free-tier keys stacked as
// separate quotas, tried in order until one doesn't 429.
const RAPIDAPI_KEYS = [process.env.RAPIDAPI_KEY, process.env.RAPIDAPI_KEY_2, process.env.RAPIDAPI_KEY_3].filter(
  Boolean
);
const RAPIDAPI_HOST = 'exercisedb.p.rapidapi.com';

const router = Router();
router.use(requireAuth);

function publicEntry(row) {
  return {
    id: row.id,
    name: row.name,
    bodyPart: row.body_part,
    equipment: row.equipment,
    target: row.target,
    difficulty: row.difficulty,
  };
}

router.get('/', async (req, res) => {
  const { search, bodyPart, equipment, target } = req.query;
  const limit = Math.min(Math.max(Number(req.query.limit) || 30, 1), 100);
  const offset = Math.max(Number(req.query.offset) || 0, 0);

  const where = [];
  const params = [];
  if (search) { where.push('name LIKE ?'); params.push(`%${search}%`); }
  if (bodyPart) { where.push('body_part = ?'); params.push(bodyPart); }
  if (equipment) { where.push('equipment = ?'); params.push(equipment); }
  if (target) { where.push('target = ?'); params.push(target); }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const [rows] = await pool.query(
    `SELECT id, name, body_part, equipment, target, difficulty FROM exercise_catalog
     ${whereSql} ORDER BY name ASC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  res.json(rows.map(publicEntry));
});

// Free, no external call — derived from our own cached data so the filter UI always
// reflects what's actually browsable, and stays in sync automatically after a re-sync.
router.get('/meta', async (req, res) => {
  const [[bodyParts], [equipment], [targets]] = await Promise.all([
    pool.query('SELECT DISTINCT body_part FROM exercise_catalog ORDER BY body_part'),
    pool.query('SELECT DISTINCT equipment FROM exercise_catalog ORDER BY equipment'),
    pool.query('SELECT DISTINCT target FROM exercise_catalog ORDER BY target'),
  ]);
  res.json({
    bodyParts: bodyParts.map((r) => r.body_part),
    equipment: equipment.map((r) => r.equipment),
    targets: targets.map((r) => r.target),
  });
});

const TRANSLATED_LANGS = ['fr', 'es', 'it'];

router.get('/:id', async (req, res) => {
  const [[row]] = await pool.query('SELECT * FROM exercise_catalog WHERE id = ?', [req.params.id]);
  if (!row) return res.status(404).json({ error: 'not_found' });

  // Name stays English always (see translate-exercise-catalog.js) — only description and
  // instructions have a translated column, and only for languages the batch job covers.
  // Falls back to English whenever a given exercise hasn't been translated yet (the batch
  // job runs incrementally) so the catalog is never blocked on it finishing.
  const lang = TRANSLATED_LANGS.includes(req.query.lang) ? req.query.lang : null;
  const description = (lang && row[`description_${lang}`]) || row.description;
  const instructionsRaw = (lang && row[`instructions_${lang}`]) || row.instructions;

  res.json({
    ...publicEntry(row),
    secondaryMuscles: JSON.parse(row.secondary_muscles ?? '[]'),
    instructions: JSON.parse(instructionsRaw ?? '[]'),
    description,
    gifUrl: `/exercise-catalog/${row.id}/gif`,
  });
});

// Remembers which key last worked so a request doesn't retry an already-exhausted one every
// time — only advances forward, never resets within the process lifetime (a fresh deploy /
// restart, or the next monthly quota reset, both naturally start this back at 0).
let currentKeyIndex = 0;

async function fetchGifFromUpstream(externalId) {
  while (currentKeyIndex < RAPIDAPI_KEYS.length) {
    const res = await fetch(`https://${RAPIDAPI_HOST}/image?exerciseId=${externalId}&resolution=180`, {
      headers: { 'x-rapidapi-host': RAPIDAPI_HOST, 'x-rapidapi-key': RAPIDAPI_KEYS[currentKeyIndex] },
    });
    if (res.status === 429) {
      currentKeyIndex++;
      continue;
    }
    if (!res.ok) throw new Error(`upstream ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }
  throw new Error('all RapidAPI keys exhausted');
}

// One RapidAPI call the very first time any user opens a given exercise, ever — then served
// straight off disk forever after. Rate-limited on top of that so a buggy/malicious client
// mashing many *different* uncached ids can't itself burn the whole month's free quota.
const gifLimiter = rateLimit({ windowMs: 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false });

router.get('/:id/gif', gifLimiter, async (req, res) => {
  const [[row]] = await pool.query(
    'SELECT id, external_id, gif_cached FROM exercise_catalog WHERE id = ?',
    [req.params.id]
  );
  if (!row) return res.status(404).json({ error: 'not_found' });

  const filePath = path.join(GIF_DIR, `${row.id}.gif`);
  if (row.gif_cached && fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  }

  if (RAPIDAPI_KEYS.length === 0) return res.status(503).json({ error: 'catalog_not_configured' });

  try {
    const buffer = await fetchGifFromUpstream(row.external_id);
    await fsp.writeFile(filePath, buffer);
    await pool.query('UPDATE exercise_catalog SET gif_cached = 1 WHERE id = ?', [row.id]);
    res.set('Content-Type', 'image/gif');
    res.send(buffer);
  } catch (err) {
    console.error('[exercise-catalog] gif fetch failed', row.external_id, err.message);
    res.status(502).json({ error: 'gif_unavailable' });
  }
});

export default router;
