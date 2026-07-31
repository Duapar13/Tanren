import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { isValidReps, isValidWeightKg } from '../utils/validate.js';

const router = Router();
router.use(requireAuth);

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

async function ownedSet(setId, userId) {
  const [[row]] = await pool.query(
    `SELECT sets.* FROM sets
     JOIN sessions ON sessions.id = sets.session_id
     WHERE sets.id = ? AND sessions.user_id = ?`,
    [setId, userId]
  );
  return row;
}

router.patch('/:id', async (req, res) => {
  const existing = await ownedSet(req.params.id, req.userId);
  if (!existing) return res.status(404).json({ error: 'not_found' });

  const { reps, weightKg, rpe } = req.body ?? {};
  if (reps !== undefined && !isValidReps(reps)) return res.status(400).json({ error: 'invalid_reps' });
  if (weightKg !== undefined && !isValidWeightKg(weightKg)) return res.status(400).json({ error: 'invalid_weight' });

  const fields = [];
  const values = [];
  if (reps !== undefined) { fields.push('reps = ?'); values.push(reps); }
  if (weightKg !== undefined) { fields.push('weight_kg = ?'); values.push(weightKg); }
  if (rpe !== undefined) { fields.push('rpe = ?'); values.push(rpe); }

  if (fields.length > 0) {
    values.push(req.params.id);
    await pool.query(`UPDATE sets SET ${fields.join(', ')} WHERE id = ?`, values);
  }

  const [[row]] = await pool.query('SELECT * FROM sets WHERE id = ?', [req.params.id]);
  res.json(publicSet(row));
});

router.delete('/:id', async (req, res) => {
  const existing = await ownedSet(req.params.id, req.userId);
  if (!existing) return res.status(404).json({ error: 'not_found' });

  await pool.query('DELETE FROM sets WHERE id = ?', [req.params.id]);
  res.status(204).end();
});

export default router;
