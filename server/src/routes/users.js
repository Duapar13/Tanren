import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads', 'avatars');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOADS_DIR,
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname) || '.jpg';
      cb(null, `user_${req.userId}_${Date.now()}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('invalid_file_type'));
    cb(null, true);
  },
});

const router = Router();
router.use(requireAuth);

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

router.get('/me', async (req, res) => {
  const [[user]] = await pool.query('SELECT * FROM users WHERE id = ?', [req.userId]);
  res.json(publicUser(user));
});

router.patch('/me', async (req, res) => {
  const {
    displayName,
    username,
    email,
    heightCm,
    goal,
    restTimerEnabled,
    restTimerSeconds,
    trainingDays,
    rpeEnabled,
    measurementsEnabled,
    customProteinG,
    customCarbsG,
    customFatG,
    onboardingCompleted,
    pushToken,
  } = req.body ?? {};

  if (goal !== undefined && !['bulk', 'cut', 'maintain'].includes(goal)) {
    return res.status(400).json({ error: 'invalid_goal' });
  }
  if (
    trainingDays !== undefined &&
    (!Array.isArray(trainingDays) || trainingDays.some((d) => !Number.isInteger(d) || d < 0 || d > 6))
  ) {
    return res.status(400).json({ error: 'invalid_training_days' });
  }
  if (username !== undefined) {
    if (!USERNAME_RE.test(username)) return res.status(400).json({ error: 'invalid_username' });
    const [clash] = await pool.query('SELECT id FROM users WHERE username = ? AND id != ?', [username, req.userId]);
    if (clash.length > 0) return res.status(409).json({ error: 'username_taken' });
  }
  if (email !== undefined) {
    if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'invalid_email' });
    const [clash] = await pool.query('SELECT id FROM users WHERE email = ? AND id != ?', [email, req.userId]);
    if (clash.length > 0) return res.status(409).json({ error: 'email_taken' });
  }

  const fields = [];
  const values = [];
  if (displayName !== undefined) { fields.push('display_name = ?'); values.push(displayName); }
  if (username !== undefined) { fields.push('username = ?'); values.push(username); }
  if (email !== undefined) { fields.push('email = ?'); values.push(email); }
  if (heightCm !== undefined) { fields.push('height_cm = ?'); values.push(heightCm); }
  if (goal !== undefined) { fields.push('goal = ?'); values.push(goal); }
  if (restTimerEnabled !== undefined) { fields.push('rest_timer_enabled = ?'); values.push(restTimerEnabled ? 1 : 0); }
  if (restTimerSeconds !== undefined) { fields.push('rest_timer_seconds = ?'); values.push(restTimerSeconds); }
  if (trainingDays !== undefined) { fields.push('training_days = ?'); values.push(trainingDays.join(',')); }
  if (rpeEnabled !== undefined) { fields.push('rpe_enabled = ?'); values.push(rpeEnabled ? 1 : 0); }
  if (measurementsEnabled !== undefined) { fields.push('measurements_enabled = ?'); values.push(measurementsEnabled ? 1 : 0); }
  if (customProteinG !== undefined) { fields.push('custom_protein_g = ?'); values.push(customProteinG); }
  if (customCarbsG !== undefined) { fields.push('custom_carbs_g = ?'); values.push(customCarbsG); }
  if (customFatG !== undefined) { fields.push('custom_fat_g = ?'); values.push(customFatG); }
  if (onboardingCompleted !== undefined) { fields.push('onboarding_completed = ?'); values.push(onboardingCompleted ? 1 : 0); }
  if (pushToken !== undefined) { fields.push('expo_push_token = ?'); values.push(pushToken); }

  if (fields.length > 0) {
    values.push(req.userId);
    await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
  }

  const [[user]] = await pool.query('SELECT * FROM users WHERE id = ?', [req.userId]);
  res.json(publicUser(user));
});

router.post('/me/avatar', (req, res, next) => {
  upload.single('avatar')(req, res, (err) => {
    if (err) return res.status(400).json({ error: 'invalid_file' });
    next();
  });
}, async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'missing_file' });

  // Clean up the previous avatar file, if any, so uploads don't accumulate forever.
  const [[existing]] = await pool.query('SELECT avatar_path FROM users WHERE id = ?', [req.userId]);
  if (existing?.avatar_path) {
    fs.unlink(path.join(UPLOADS_DIR, existing.avatar_path), () => {});
  }

  await pool.query('UPDATE users SET avatar_path = ? WHERE id = ?', [req.file.filename, req.userId]);
  const [[user]] = await pool.query('SELECT * FROM users WHERE id = ?', [req.userId]);
  res.json(publicUser(user));
});

export default router;
