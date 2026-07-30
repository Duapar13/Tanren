import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

function publicUser(row) {
  return {
    id: row.id,
    email: row.email,
    username: row.username,
    displayName: row.display_name,
    heightCm: row.height_cm !== null ? Number(row.height_cm) : null,
    goal: row.goal,
    restTimerEnabled: !!row.rest_timer_enabled,
    restTimerSeconds: row.rest_timer_seconds,
    trainingDays: row.training_days ? row.training_days.split(',').filter(Boolean).map(Number) : [],
    splitType: row.split_type,
    rpeEnabled: !!row.rpe_enabled,
    measurementsEnabled: !!row.measurements_enabled,
  };
}

router.get('/me', async (req, res) => {
  const [[user]] = await pool.query('SELECT * FROM users WHERE id = ?', [req.userId]);
  res.json(publicUser(user));
});

router.patch('/me', async (req, res) => {
  const {
    displayName,
    heightCm,
    goal,
    restTimerEnabled,
    restTimerSeconds,
    trainingDays,
    splitType,
    rpeEnabled,
    measurementsEnabled,
  } = req.body ?? {};

  if (goal !== undefined && !['bulk', 'cut', 'maintain'].includes(goal)) {
    return res.status(400).json({ error: 'invalid_goal' });
  }
  if (splitType !== undefined && !['upper_lower', 'ppl'].includes(splitType)) {
    return res.status(400).json({ error: 'invalid_split_type' });
  }
  if (
    trainingDays !== undefined &&
    (!Array.isArray(trainingDays) || trainingDays.some((d) => !Number.isInteger(d) || d < 0 || d > 6))
  ) {
    return res.status(400).json({ error: 'invalid_training_days' });
  }

  const fields = [];
  const values = [];
  if (displayName !== undefined) { fields.push('display_name = ?'); values.push(displayName); }
  if (heightCm !== undefined) { fields.push('height_cm = ?'); values.push(heightCm); }
  if (goal !== undefined) { fields.push('goal = ?'); values.push(goal); }
  if (restTimerEnabled !== undefined) { fields.push('rest_timer_enabled = ?'); values.push(restTimerEnabled ? 1 : 0); }
  if (restTimerSeconds !== undefined) { fields.push('rest_timer_seconds = ?'); values.push(restTimerSeconds); }
  if (trainingDays !== undefined) { fields.push('training_days = ?'); values.push(trainingDays.join(',')); }
  if (splitType !== undefined) { fields.push('split_type = ?'); values.push(splitType); }
  if (rpeEnabled !== undefined) { fields.push('rpe_enabled = ?'); values.push(rpeEnabled ? 1 : 0); }
  if (measurementsEnabled !== undefined) { fields.push('measurements_enabled = ?'); values.push(measurementsEnabled ? 1 : 0); }

  if (fields.length > 0) {
    values.push(req.userId);
    await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
  }

  const [[user]] = await pool.query('SELECT * FROM users WHERE id = ?', [req.userId]);
  res.json(publicUser(user));
});

export default router;
