import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import {
  computePlacementStatus,
  computeSeasonRanking,
  currentSeasonInfo,
  seasonInfoForNumber,
  estimate1RM,
} from '../utils/ranking.js';

const router = Router();
router.use(requireAuth);

/**
 * Average best estimated 1RM per exercise NAME, across every user who has logged it — feeds
 * the "above the community average" bonus. Matched by name rather than exercise_id: every
 * exercise row in this schema (including the presets that ship with the app) is a per-user
 * copy with its own id and a real user_id, there's no shared/canonical row to key off — see
 * exercises table. Two different users' "Développé couché" are different exercise_ids but the
 * same real-world lift, so name (trimmed, case-insensitive) is the only workable join key.
 * Scans every user's sets on every report; fine at today's scale, worth revisiting (e.g. a
 * cached/precomputed table refreshed periodically) if the user base grows a lot.
 */
async function fetchGlobalExerciseAverages() {
  const [rows] = await pool.query(
    `SELECT sessions.user_id AS userId, LOWER(TRIM(exercises.name)) AS exerciseName,
            sets.weight_kg AS weightKg, sets.reps AS reps
     FROM sets
     JOIN sessions ON sessions.id = sets.session_id
     JOIN exercises ON exercises.id = sets.exercise_id`
  );

  const bestByUserExercise = new Map();
  for (const r of rows) {
    const key = `${r.userId}:${r.exerciseName}`;
    const est = estimate1RM(r.weightKg, r.reps);
    const existing = bestByUserExercise.get(key);
    if (!existing || est > existing) bestByUserExercise.set(key, est);
  }

  const sumsByExercise = new Map();
  for (const [key, best] of bestByUserExercise) {
    const exerciseName = key.slice(key.indexOf(':') + 1);
    const agg = sumsByExercise.get(exerciseName) ?? { sum: 0, count: 0 };
    agg.sum += best;
    agg.count += 1;
    sumsByExercise.set(exerciseName, agg);
  }

  const averages = new Map();
  for (const [exerciseName, { sum, count }] of sumsByExercise) {
    averages.set(exerciseName, sum / count);
  }
  return averages;
}

/**
 * Ranking used to be entirely client-reported (a client would just POST whatever points/rank
 * it computed for itself) — trivially fakeable by anyone willing to call the API directly.
 * The client still computes its own ranking locally for instant/offline display, but what
 * lands on the leaderboard is now always recomputed here from the user's actual synced rows
 * (utils/ranking.js, a straight port of the client formula), so this endpoint only takes a
 * trigger to recompute "now" — the season number is optional and just picks which season to
 * (re)score, never the score itself.
 */
router.post('/report', async (req, res) => {
  const { seasonNumber } = req.body ?? {};
  const seasonInfo = Number.isInteger(seasonNumber) ? seasonInfoForNumber(seasonNumber) : currentSeasonInfo();

  const [[user]] = await pool.query(
    'SELECT training_days, goal, measurements_enabled, created_at FROM users WHERE id = ?',
    [req.userId]
  );
  if (!user) return res.status(404).json({ error: 'not_found' });

  const [sessions] = await pool.query('SELECT id, date FROM sessions WHERE user_id = ?', [req.userId]);
  const [sets] = await pool.query(
    `SELECT sets.session_id AS sessionId, sets.exercise_id AS exerciseId,
            sets.weight_kg AS weightKg, sets.reps AS reps,
            LOWER(TRIM(exercises.name)) AS exerciseName
     FROM sets
     JOIN sessions ON sessions.id = sets.session_id
     JOIN exercises ON exercises.id = sets.exercise_id
     WHERE sessions.user_id = ?`,
    [req.userId]
  );
  const [nutritionEntries] = await pool.query(
    'SELECT date, protein_g AS proteinG, carbs_g AS carbsG, fat_g AS fatG FROM nutrition_entries WHERE user_id = ?',
    [req.userId]
  );
  const [measurementEntries] = await pool.query(
    'SELECT id, date, type, value_cm AS valueCm FROM measurement_entries WHERE user_id = ?',
    [req.userId]
  );
  const [bodyWeightEntries] = await pool.query(
    'SELECT weight_kg AS weightKg FROM body_weight_entries WHERE user_id = ? ORDER BY date DESC, id DESC',
    [req.userId]
  );
  const globalExerciseAverages = await fetchGlobalExerciseAverages();

  const rankingParams = {
    sessions,
    sets,
    nutritionEntries,
    measurementEntries,
    bodyWeightEntries,
    measurementsEnabled: !!user.measurements_enabled,
    trainingDays: user.training_days ? user.training_days.split(',').filter(Boolean).map(Number) : [],
    goal: user.goal,
    accountCreatedAt: String(user.created_at).slice(0, 10),
    globalExerciseAverages,
  };
  const ranking = computeSeasonRanking(rankingParams, seasonInfo);
  const placement = computePlacementStatus(rankingParams, seasonInfo);

  await pool.query(
    'UPDATE users SET season_number = ?, season_points = ?, season_rank = ?, season_division = ?, season_in_placement = ? WHERE id = ?',
    [
      seasonInfo.seasonNumber,
      ranking.totalPoints,
      ranking.rank,
      ranking.division,
      placement.applicable && placement.inPlacement ? 1 : 0,
      req.userId,
    ]
  );
  res.status(204).end();
});

// While a player is mid-placement (see computePlacementStatus), their real rank/division/points
// are hidden from everyone else too — not just their own device's UI — otherwise the global
// leaderboard would leak exactly the number the app is trying not to show them yet.
function publicEntry(r) {
  if (r.season_in_placement) {
    return {
      userId: r.id,
      username: r.username,
      displayName: r.display_name,
      points: null,
      rank: null,
      division: null,
      inPlacement: true,
    };
  }
  return {
    userId: r.id,
    username: r.username,
    displayName: r.display_name,
    points: r.season_points,
    rank: r.season_rank,
    division: r.season_division,
    inPlacement: false,
  };
}

router.get('/', async (req, res) => {
  const seasonNumber = Number(req.query.seasonNumber);
  if (!Number.isInteger(seasonNumber)) return res.status(400).json({ error: 'invalid_season' });

  const [rows] = await pool.query(
    `SELECT id, username, display_name, season_points, season_rank, season_division, season_in_placement
     FROM users
     WHERE season_number = ?
     ORDER BY season_points DESC
     LIMIT 100`,
    [seasonNumber]
  );

  // The caller's own line, plus its position — even when it falls outside the top 100 the
  // client still has something to pin at the bottom instead of the caller wondering where
  // they rank at all.
  const [[me]] = await pool.query(
    `SELECT u.id, u.username, u.display_name, u.season_points, u.season_rank, u.season_division, u.season_in_placement,
       (SELECT COUNT(*) + 1 FROM users u2 WHERE u2.season_number = ? AND u2.season_points > u.season_points) AS position
     FROM users u
     WHERE u.id = ? AND u.season_number = ?`,
    [seasonNumber, req.userId, seasonNumber]
  );

  res.json({
    entries: rows.map(publicEntry),
    me: me ? { ...publicEntry(me), position: me.position } : null,
  });
});

export default router;
