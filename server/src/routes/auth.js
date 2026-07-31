import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { pool } from '../db.js';
import { signAccessToken, generateRefreshToken, hashRefreshToken } from '../utils/jwt.js';
import { verifyGoogleIdToken, verifyAppleIdToken } from '../utils/oauth.js';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
});
router.use(authLimiter);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

function publicUser(row) {
  return {
    id: row.id,
    email: row.email,
    username: row.username,
    displayName: row.display_name,
    heightCm: row.height_cm !== null ? Number(row.height_cm) : null,
    goal: row.goal,
    restTimerEnabled: !!row.rest_timer_enabled,
    restTimerSeconds: row.rest_timer_seconds,
    trainingDays: row.training_days ? row.training_days.split(',').filter(Boolean).map(Number) : [],
    rpeEnabled: !!row.rpe_enabled,
    measurementsEnabled: !!row.measurements_enabled,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    customProteinG: row.custom_protein_g !== null ? Number(row.custom_protein_g) : null,
    customCarbsG: row.custom_carbs_g !== null ? Number(row.custom_carbs_g) : null,
    customFatG: row.custom_fat_g !== null ? Number(row.custom_fat_g) : null,
    onboardingCompleted: !!row.onboarding_completed,
    avatarUrl: row.avatar_path ? `/uploads/avatars/${row.avatar_path}` : null,
    pushNotificationsEnabled: !!row.expo_push_token,
  };
}

async function issueTokens(userId) {
  const accessToken = signAccessToken(userId);
  const { token: refreshToken, hash, expiresAt } = generateRefreshToken();
  await pool.query(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
    [userId, hash, expiresAt]
  );
  return { accessToken, refreshToken };
}

router.post('/signup', async (req, res) => {
  const { email, username, password } = req.body ?? {};
  if (!email || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'invalid_email' });
  }
  if (!username || !USERNAME_RE.test(username)) {
    return res.status(400).json({ error: 'invalid_username' });
  }
  if (!password || password.length < 8) {
    return res.status(400).json({ error: 'weak_password' });
  }

  const [existing] = await pool.query(
    'SELECT id FROM users WHERE email = ? OR username = ? LIMIT 1',
    [email, username]
  );
  if (existing.length > 0) {
    return res.status(409).json({ error: 'account_exists' });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const [result] = await pool.query(
    'INSERT INTO users (email, username, password_hash, display_name) VALUES (?, ?, ?, ?)',
    [email, username, passwordHash, username]
  );

  const [[user]] = await pool.query('SELECT * FROM users WHERE id = ?', [result.insertId]);
  const tokens = await issueTokens(user.id);
  res.status(201).json({ user: publicUser(user), ...tokens });
});

router.post('/login', async (req, res) => {
  const { identifier, password } = req.body ?? {};
  if (!identifier || !password) {
    return res.status(400).json({ error: 'missing_credentials' });
  }

  const [rows] = await pool.query(
    'SELECT * FROM users WHERE email = ? OR username = ? LIMIT 1',
    [identifier, identifier]
  );
  const user = rows[0];
  if (!user || !user.password_hash) {
    return res.status(401).json({ error: 'invalid_credentials' });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'invalid_credentials' });
  }

  const tokens = await issueTokens(user.id);
  res.json({ user: publicUser(user), ...tokens });
});

async function findOrCreateOAuthUser({ provider, sub, email }) {
  const column = provider === 'google' ? 'google_sub' : 'apple_sub';
  const [rows] = await pool.query(`SELECT * FROM users WHERE ${column} = ? LIMIT 1`, [sub]);
  if (rows[0]) return rows[0];

  const baseUsername = (email ? email.split('@')[0] : provider) .replace(/[^a-zA-Z0-9_]/g, '') || provider;
  let username = baseUsername.slice(0, 20);
  let suffix = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const [clash] = await pool.query('SELECT id FROM users WHERE username = ? LIMIT 1', [username]);
    if (clash.length === 0) break;
    suffix += 1;
    username = `${baseUsername.slice(0, 16)}${suffix}`;
  }

  const [result] = await pool.query(
    `INSERT INTO users (email, username, display_name, ${column}) VALUES (?, ?, ?, ?)`,
    [email ?? null, username, username, sub]
  );
  const [[user]] = await pool.query('SELECT * FROM users WHERE id = ?', [result.insertId]);
  return user;
}

router.post('/oauth/google', async (req, res) => {
  const { idToken } = req.body ?? {};
  if (!idToken) return res.status(400).json({ error: 'missing_id_token' });
  try {
    const { sub, email } = await verifyGoogleIdToken(idToken);
    const user = await findOrCreateOAuthUser({ provider: 'google', sub, email });
    const tokens = await issueTokens(user.id);
    res.json({ user: publicUser(user), ...tokens });
  } catch (err) {
    res.status(401).json({ error: 'google_verification_failed', detail: err.message });
  }
});

router.post('/oauth/apple', async (req, res) => {
  const { idToken } = req.body ?? {};
  if (!idToken) return res.status(400).json({ error: 'missing_id_token' });
  try {
    const { sub, email } = await verifyAppleIdToken(idToken);
    const user = await findOrCreateOAuthUser({ provider: 'apple', sub, email });
    const tokens = await issueTokens(user.id);
    res.json({ user: publicUser(user), ...tokens });
  } catch (err) {
    res.status(401).json({ error: 'apple_verification_failed', detail: err.message });
  }
});

router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body ?? {};
  if (!refreshToken) return res.status(400).json({ error: 'missing_refresh_token' });

  const hash = hashRefreshToken(refreshToken);
  const [rows] = await pool.query(
    'SELECT * FROM refresh_tokens WHERE token_hash = ? AND expires_at > NOW() LIMIT 1',
    [hash]
  );
  const record = rows[0];
  if (!record) return res.status(401).json({ error: 'invalid_refresh_token' });

  await pool.query('DELETE FROM refresh_tokens WHERE id = ?', [record.id]);
  const tokens = await issueTokens(record.user_id);
  res.json(tokens);
});

router.post('/logout', async (req, res) => {
  const { refreshToken } = req.body ?? {};
  if (refreshToken) {
    await pool.query('DELETE FROM refresh_tokens WHERE token_hash = ?', [hashRefreshToken(refreshToken)]);
  }
  res.status(204).end();
});

export default router;
