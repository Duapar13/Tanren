import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

/**
 * Ranking is computed entirely client-side (season points, rank, division) from each
 * user's own synced data — there's no server-side scoring engine. The leaderboard just
 * stores whatever a client last reported for itself, so it's only as fresh as the last
 * time each user's app computed and reported its own score (which rang.tsx does on load).
 */
router.post('/report', async (req, res) => {
  const { seasonNumber, points, rank, division } = req.body ?? {};
  if (!Number.isInteger(seasonNumber) || !Number.isFinite(points)) {
    return res.status(400).json({ error: 'invalid_report' });
  }
  await pool.query(
    'UPDATE users SET season_number = ?, season_points = ?, season_rank = ?, season_division = ? WHERE id = ?',
    [seasonNumber, Math.round(points), rank ?? null, division ?? null, req.userId]
  );
  res.status(204).end();
});

router.get('/', async (req, res) => {
  const seasonNumber = Number(req.query.seasonNumber);
  if (!Number.isInteger(seasonNumber)) return res.status(400).json({ error: 'invalid_season' });

  const [rows] = await pool.query(
    `SELECT id, username, display_name, season_points, season_rank, season_division
     FROM users
     WHERE season_number = ?
     ORDER BY season_points DESC
     LIMIT 100`,
    [seasonNumber]
  );
  res.json(
    rows.map((r) => ({
      userId: r.id,
      username: r.username,
      displayName: r.display_name,
      points: r.season_points,
      rank: r.season_rank,
      division: r.season_division,
    }))
  );
});

export default router;
