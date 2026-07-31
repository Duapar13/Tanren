import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const TYPES = ['biceps', 'waist', 'chest', 'thighs', 'neck', 'forearms', 'calves', 'hips'];

const router = Router();
router.use(requireAuth);

function publicEntry(row) {
  return { id: row.id, date: row.date, type: row.type, valueCm: Number(row.value_cm) };
}

router.get('/', async (req, res) => {
  const [rows] = await pool.query(
    'SELECT * FROM measurement_entries WHERE user_id = ? ORDER BY date DESC, id DESC',
    [req.userId]
  );
  res.json(rows.map(publicEntry));
});

router.post('/', async (req, res) => {
  const { date, type, valueCm } = req.body ?? {};
  if (!date || !TYPES.includes(type) || !valueCm) return res.status(400).json({ error: 'invalid_entry' });

  const [result] = await pool.query(
    'INSERT INTO measurement_entries (user_id, date, type, value_cm) VALUES (?, ?, ?, ?)',
    [req.userId, date, type, valueCm]
  );
  const [[row]] = await pool.query('SELECT * FROM measurement_entries WHERE id = ?', [result.insertId]);
  res.status(201).json(publicEntry(row));
});

router.delete('/:id', async (req, res) => {
  const [result] = await pool.query(
    'DELETE FROM measurement_entries WHERE id = ? AND user_id = ?',
    [req.params.id, req.userId]
  );
  if (result.affectedRows === 0) return res.status(404).json({ error: 'not_found' });
  res.status(204).end();
});

export default router;
