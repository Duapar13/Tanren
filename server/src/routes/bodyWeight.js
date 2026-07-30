import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

function publicEntry(row) {
  return { id: row.id, date: row.date, weightKg: Number(row.weight_kg) };
}

router.get('/', async (req, res) => {
  const [rows] = await pool.query(
    'SELECT * FROM body_weight_entries WHERE user_id = ? ORDER BY date DESC, id DESC',
    [req.userId]
  );
  res.json(rows.map(publicEntry));
});

router.post('/', async (req, res) => {
  const { date, weightKg } = req.body ?? {};
  if (!date || !weightKg) return res.status(400).json({ error: 'invalid_entry' });

  const [result] = await pool.query(
    'INSERT INTO body_weight_entries (user_id, date, weight_kg) VALUES (?, ?, ?)',
    [req.userId, date, weightKg]
  );
  const [[row]] = await pool.query('SELECT * FROM body_weight_entries WHERE id = ?', [result.insertId]);
  res.status(201).json(publicEntry(row));
});

router.delete('/:id', async (req, res) => {
  const [result] = await pool.query(
    'DELETE FROM body_weight_entries WHERE id = ? AND user_id = ?',
    [req.params.id, req.userId]
  );
  if (result.affectedRows === 0) return res.status(404).json({ error: 'not_found' });
  res.status(204).end();
});

export default router;
