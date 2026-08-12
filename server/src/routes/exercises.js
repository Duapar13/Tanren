import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

function publicExercise(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.target,
    muscleGroup: row.muscle_group,
    isCustom: !!row.is_custom,
    catalogRefId: row.catalog_ref_id,
    deletedAt: row.deleted_at,
  };
}

router.get('/', async (req, res) => {
  const [rows] = await pool.query(
    'SELECT * FROM exercises WHERE user_id IS NULL OR user_id = ? ORDER BY name',
    [req.userId]
  );
  res.json(rows.map(publicExercise));
});

router.post('/', async (req, res) => {
  const { name, category, catalogRefId } = req.body ?? {};
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'invalid_name' });
  }
  if (!['upper', 'lower'].includes(category)) {
    return res.status(400).json({ error: 'invalid_category' });
  }
  if (catalogRefId !== undefined && catalogRefId !== null && !Number.isInteger(catalogRefId)) {
    return res.status(400).json({ error: 'invalid_catalog_ref' });
  }

  const [result] = await pool.query(
    'INSERT INTO exercises (user_id, name, target, is_custom, catalog_ref_id) VALUES (?, ?, ?, 1, ?)',
    [req.userId, name.trim(), category, catalogRefId ?? null]
  );
  const [[row]] = await pool.query('SELECT * FROM exercises WHERE id = ?', [result.insertId]);
  res.status(201).json(publicExercise(row));
});

router.patch('/:id', async (req, res) => {
  const { name, category } = req.body ?? {};
  if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
    return res.status(400).json({ error: 'invalid_name' });
  }
  if (category !== undefined && !['upper', 'lower'].includes(category)) {
    return res.status(400).json({ error: 'invalid_category' });
  }

  const fields = [];
  const values = [];
  if (name !== undefined) { fields.push('name = ?'); values.push(name.trim()); }
  if (category !== undefined) { fields.push('target = ?'); values.push(category); }

  if (fields.length > 0) {
    values.push(req.params.id, req.userId);
    const [result] = await pool.query(
      `UPDATE exercises SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`,
      values
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'not_found' });
  }

  const [[row]] = await pool.query('SELECT * FROM exercises WHERE id = ?', [req.params.id]);
  res.json(publicExercise(row));
});

// Soft delete: sets keep a real fk_set_exercise reference (no ON DELETE CASCADE/SET NULL), so a
// hard DELETE here throws a FK violation for any exercise with logged history — which used to
// wedge the whole client sync queue behind that one permanently-failing item. Marking deleted_at
// also lets historical sets keep showing the real exercise name instead of losing it forever.
router.delete('/:id', async (req, res) => {
  const [result] = await pool.query(
    'UPDATE exercises SET deleted_at = NOW() WHERE id = ? AND user_id = ? AND deleted_at IS NULL',
    [req.params.id, req.userId]
  );
  if (result.affectedRows === 0) {
    const [[row]] = await pool.query(
      'SELECT id FROM exercises WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    );
    if (!row) return res.status(404).json({ error: 'not_found' });
  }
  res.status(204).end();
});

export default router;
