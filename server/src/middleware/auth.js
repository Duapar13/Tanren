import { verifyAccessToken } from '../utils/jwt.js';
import { pool } from '../db.js';

// A JWT stays valid until it expires even if the account behind it is gone (deleted
// account, wiped test data, etc). Checking existence here — once, for every authenticated
// route — means a stale token cleanly 401s everywhere instead of 500ing wherever a route
// assumes req.userId still points at a real row.
export async function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'missing_token' });
  }
  let userId;
  try {
    userId = verifyAccessToken(header.slice('Bearer '.length));
  } catch {
    return res.status(401).json({ error: 'invalid_token' });
  }
  const [[row]] = await pool.query('SELECT id FROM users WHERE id = ?', [userId]);
  if (!row) return res.status(401).json({ error: 'user_not_found' });
  req.userId = userId;
  next();
}
