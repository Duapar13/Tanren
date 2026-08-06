import crypto from 'node:crypto';

// No bcrypt dependency in this project — scrypt is built into Node, so the admin
// password hash needs nothing extra installed on the server. Stored as "salt:hash" hex.
const SCRYPT_KEYLEN = 64;

export function hashAdminPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, SCRYPT_KEYLEN).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyAdminPassword(password, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  const expected = Buffer.from(hash, 'hex');
  const candidate = crypto.scryptSync(password, salt, SCRYPT_KEYLEN);
  if (candidate.length !== expected.length) return false;
  return crypto.timingSafeEqual(candidate, expected);
}
