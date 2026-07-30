import { verifyAccessToken } from '../utils/jwt.js';

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'missing_token' });
  }
  try {
    req.userId = verifyAccessToken(header.slice('Bearer '.length));
    next();
  } catch {
    return res.status(401).json({ error: 'invalid_token' });
  }
}
