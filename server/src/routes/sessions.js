import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { computeTrainingStreak } from '../utils/streak.js';
import { sendExpoPush } from '../utils/push.js';
import { isValidReps, isValidWeightKg } from '../utils/validate.js';

const STREAK_MILESTONES = [3, 5, 7, 10, 14, 21, 30, 60, 100, 365];

const router = Router();
router.use(requireAuth);

function publicSession(row) {
  return {
    id: row.id,
    date: row.date,
    category: row.category,
    notes: row.notes ?? '',
    startedAt: row.started_at,
    finishedAt: row.finished_at,
  };
}

function publicSet(row) {
  return {
    id: row.id,
    sessionId: row.session_id,
    exerciseId: row.exercise_id,
    setNumber: row.set_number,
    reps: row.reps,
    weightKg: Number(row.weight_kg),
    rpe: row.rpe !== null ? Number(row.rpe) : null,
  };
}

async function notifyStreakMilestone(userId) {
  const [[user]] = await pool.query(
    'SELECT training_days, expo_push_token FROM users WHERE id = ?',
    [userId]
  );
  if (!user?.expo_push_token) return;

  const trainingDays = user.training_days ? user.training_days.split(',').filter(Boolean).map(Number) : [];
  const streak = await computeTrainingStreak(userId, trainingDays);
  if (!STREAK_MILESTONES.includes(streak)) return;

  await sendExpoPush(
    user.expo_push_token,
    'GG 🔥',
    `${streak} séances d'affilée sans en manquer une — continue comme ça !`
  );
}

router.get('/', async (req, res) => {
  const [rows] = await pool.query(
    'SELECT * FROM sessions WHERE user_id = ? ORDER BY date DESC, id DESC',
    [req.userId]
  );
  res.json(rows.map(publicSession));
});

router.get('/:id', async (req, res) => {
  const [[session]] = await pool.query(
    'SELECT * FROM sessions WHERE id = ? AND user_id = ?',
    [req.params.id, req.userId]
  );
  if (!session) return res.status(404).json({ error: 'not_found' });

  const [sets] = await pool.query('SELECT * FROM sets WHERE session_id = ? ORDER BY id', [session.id]);
  res.json({ ...publicSession(session), sets: sets.map(publicSet) });
});

router.post('/', async (req, res) => {
  const { date, category, notes, sets } = req.body ?? {};
  if (!date || !['upper', 'lower', 'custom'].includes(category)) {
    return res.status(400).json({ error: 'invalid_session' });
  }
  if (
    Array.isArray(sets) &&
    sets.some((s) => (s.reps !== undefined && !isValidReps(s.reps)) || (s.weightKg !== undefined && !isValidWeightKg(s.weightKg)))
  ) {
    return res.status(400).json({ error: 'invalid_set' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [result] = await conn.query(
      'INSERT INTO sessions (user_id, date, category, notes, started_at, finished_at) VALUES (?, ?, ?, ?, NOW(), NOW())',
      [req.userId, date, category, notes ?? '']
    );
    const sessionId = result.insertId;

    if (Array.isArray(sets)) {
      for (const s of sets) {
        await conn.query(
          'INSERT INTO sets (session_id, exercise_id, set_number, reps, weight_kg, rpe) VALUES (?, ?, ?, ?, ?, ?)',
          [sessionId, s.exerciseId, s.setNumber, s.reps ?? 0, s.weightKg ?? 0, s.rpe ?? null]
        );
      }
    }

    await conn.commit();

    const [[session]] = await conn.query('SELECT * FROM sessions WHERE id = ?', [sessionId]);
    const [savedSets] = await conn.query('SELECT * FROM sets WHERE session_id = ? ORDER BY id', [sessionId]);
    res.status(201).json({ ...publicSession(session), sets: savedSets.map(publicSet) });

    // Fire-and-forget: a streak congratulations push shouldn't ever block or fail the request.
    notifyStreakMilestone(req.userId).catch((err) => console.error('[push] streak check failed', err));
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
});

router.post('/:id/sets', async (req, res) => {
  const [[session]] = await pool.query(
    'SELECT id FROM sessions WHERE id = ? AND user_id = ?',
    [req.params.id, req.userId]
  );
  if (!session) return res.status(404).json({ error: 'not_found' });

  const { exerciseId, setNumber, reps, weightKg, rpe } = req.body ?? {};
  if (!exerciseId || !setNumber) {
    return res.status(400).json({ error: 'invalid_set' });
  }
  if ((reps !== undefined && !isValidReps(reps)) || (weightKg !== undefined && !isValidWeightKg(weightKg))) {
    return res.status(400).json({ error: 'invalid_set' });
  }

  const [result] = await pool.query(
    'INSERT INTO sets (session_id, exercise_id, set_number, reps, weight_kg, rpe) VALUES (?, ?, ?, ?, ?, ?)',
    [session.id, exerciseId, setNumber, reps ?? 0, weightKg ?? 0, rpe ?? null]
  );
  const [[row]] = await pool.query('SELECT * FROM sets WHERE id = ?', [result.insertId]);
  res.status(201).json(publicSet(row));
});

router.delete('/:id', async (req, res) => {
  const [result] = await pool.query(
    'DELETE FROM sessions WHERE id = ? AND user_id = ?',
    [req.params.id, req.userId]
  );
  if (result.affectedRows === 0) return res.status(404).json({ error: 'not_found' });
  res.status(204).end();
});

export default router;
