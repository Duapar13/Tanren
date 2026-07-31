import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { sendExpoPush } from '../utils/push.js';

const router = Router();
router.use(requireAuth);

/** Sends a real push to the caller's own registered device — the simplest way to confirm
 * the whole chain (permission -> token -> server -> Expo -> APNs) actually works end to end. */
router.post('/test', async (req, res) => {
  const [[user]] = await pool.query('SELECT expo_push_token FROM users WHERE id = ?', [req.userId]);
  if (!user?.expo_push_token) {
    return res.status(400).json({ error: 'no_push_token' });
  }
  await sendExpoPush(user.expo_push_token, 'Tanren', 'Ceci est une notification de test 💪');
  res.status(204).end();
});

export default router;
