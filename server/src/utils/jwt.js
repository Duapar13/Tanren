import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { config } from '../config.js';

export function signAccessToken(userId) {
  return jwt.sign({ sub: userId }, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessTtl,
  });
}

export function verifyAccessToken(token) {
  const payload = jwt.verify(token, config.jwt.accessSecret);
  return payload.sub;
}

export function generateRefreshToken() {
  const token = crypto.randomBytes(48).toString('hex');
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + config.jwt.refreshTtlDays * 24 * 60 * 60 * 1000);
  return { token, hash, expiresAt };
}

export function hashRefreshToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}
