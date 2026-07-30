import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

function publicEntry(row) {
  return {
    id: row.id,
    date: row.date,
    proteinG: Number(row.protein_g),
    carbsG: Number(row.carbs_g),
    fatG: Number(row.fat_g),
    foodName: row.food_name,
    grams: row.grams !== null ? Number(row.grams) : null,
    unit: row.unit ?? 'g',
    barcode: row.barcode,
  };
}

router.get('/', async (req, res) => {
  const [rows] = await pool.query(
    'SELECT * FROM nutrition_entries WHERE user_id = ? ORDER BY date DESC, id DESC',
    [req.userId]
  );
  res.json(rows.map(publicEntry));
});

router.post('/', async (req, res) => {
  const { date, proteinG, carbsG, fatG, foodName, grams, unit, barcode } = req.body ?? {};
  if (!date) return res.status(400).json({ error: 'invalid_entry' });

  const [result] = await pool.query(
    'INSERT INTO nutrition_entries (user_id, date, protein_g, carbs_g, fat_g, food_name, grams, unit, barcode) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [req.userId, date, proteinG ?? 0, carbsG ?? 0, fatG ?? 0, foodName ?? null, grams ?? null, unit ?? 'g', barcode ?? null]
  );
  const [[row]] = await pool.query('SELECT * FROM nutrition_entries WHERE id = ?', [result.insertId]);
  res.status(201).json(publicEntry(row));
});

router.patch('/:id', async (req, res) => {
  const { proteinG, carbsG, fatG, foodName, grams, unit, barcode } = req.body ?? {};
  const fields = [];
  const values = [];
  if (proteinG !== undefined) { fields.push('protein_g = ?'); values.push(proteinG); }
  if (carbsG !== undefined) { fields.push('carbs_g = ?'); values.push(carbsG); }
  if (fatG !== undefined) { fields.push('fat_g = ?'); values.push(fatG); }
  if (foodName !== undefined) { fields.push('food_name = ?'); values.push(foodName); }
  if (grams !== undefined) { fields.push('grams = ?'); values.push(grams); }
  if (unit !== undefined) { fields.push('unit = ?'); values.push(unit); }
  if (barcode !== undefined) { fields.push('barcode = ?'); values.push(barcode); }

  if (fields.length > 0) {
    values.push(req.params.id, req.userId);
    const [result] = await pool.query(
      `UPDATE nutrition_entries SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`,
      values
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'not_found' });
  }

  const [[row]] = await pool.query('SELECT * FROM nutrition_entries WHERE id = ?', [req.params.id]);
  res.json(publicEntry(row));
});

router.delete('/:id', async (req, res) => {
  const [result] = await pool.query(
    'DELETE FROM nutrition_entries WHERE id = ? AND user_id = ?',
    [req.params.id, req.userId]
  );
  if (result.affectedRows === 0) return res.status(404).json({ error: 'not_found' });
  res.status(204).end();
});

export default router;
