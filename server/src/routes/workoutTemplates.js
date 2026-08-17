import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const [templates] = await pool.query(
    'SELECT id, name, created_at AS createdAt FROM workout_templates WHERE user_id = ? AND deleted_at IS NULL ORDER BY created_at DESC',
    [req.userId]
  );
  if (templates.length === 0) return res.json([]);

  const [rows] = await pool.query(
    `SELECT template_id AS templateId, exercise_id AS exerciseId
     FROM workout_template_exercises
     WHERE template_id IN (?)
     ORDER BY template_id, order_index`,
    [templates.map((t) => t.id)]
  );
  const exerciseIdsByTemplate = new Map();
  for (const r of rows) {
    const list = exerciseIdsByTemplate.get(r.templateId) ?? [];
    list.push(r.exerciseId);
    exerciseIdsByTemplate.set(r.templateId, list);
  }

  res.json(
    templates.map((t) => ({ ...t, exerciseIds: exerciseIdsByTemplate.get(t.id) ?? [] }))
  );
});

router.post('/', async (req, res) => {
  const { name, exerciseIds } = req.body ?? {};
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'invalid_name' });
  }
  if (!Array.isArray(exerciseIds) || exerciseIds.length === 0 || exerciseIds.some((id) => !Number.isInteger(id))) {
    return res.status(400).json({ error: 'invalid_exercise_ids' });
  }

  // Every referenced exercise must actually belong to this user — otherwise a crafted request
  // could link a template to someone else's exercise id.
  const [owned] = await pool.query(
    'SELECT id FROM exercises WHERE id IN (?) AND user_id = ?',
    [exerciseIds, req.userId]
  );
  if (owned.length !== new Set(exerciseIds).size) {
    return res.status(400).json({ error: 'unknown_exercise' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [result] = await conn.query(
      'INSERT INTO workout_templates (user_id, name) VALUES (?, ?)',
      [req.userId, name.trim()]
    );
    const templateId = result.insertId;
    await conn.query(
      'INSERT INTO workout_template_exercises (template_id, exercise_id, order_index) VALUES ?',
      [exerciseIds.map((exerciseId, i) => [templateId, exerciseId, i])]
    );
    await conn.commit();
    res.status(201).json({ id: templateId, name: name.trim(), exerciseIds });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
});

router.delete('/:id', async (req, res) => {
  const [result] = await pool.query(
    'UPDATE workout_templates SET deleted_at = NOW() WHERE id = ? AND user_id = ? AND deleted_at IS NULL',
    [req.params.id, req.userId]
  );
  if (result.affectedRows === 0) return res.status(404).json({ error: 'not_found' });
  res.status(204).end();
});

export default router;
