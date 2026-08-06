import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { getCookie } from '../utils/cookies.js';

export const ADMIN_COOKIE = 'ningyma_admin_session';
export const ADMIN_SESSION_TTL_SECONDS = 12 * 60 * 60; // 12h — a dashboard tab left open re-prompts once a day

export function requireAdmin(req, res, next) {
  const token = getCookie(req, ADMIN_COOKIE);
  if (!token) return res.status(401).json({ error: 'not_authenticated' });
  try {
    jwt.verify(token, config.admin.jwtSecret);
  } catch {
    return res.status(401).json({ error: 'session_expired' });
  }
  next();
}
