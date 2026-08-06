import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import fs from 'node:fs/promises';
import { pool } from '../db.js';
import { config } from '../config.js';
import { verifyAdminPassword } from '../utils/adminAuth.js';
import { setCookie, clearCookie } from '../utils/cookies.js';
import { requireAdmin, ADMIN_COOKIE, ADMIN_SESSION_TTL_SECONDS } from '../middleware/adminAuth.js';
import { currentSeasonInfo, RANKS } from '../utils/ranking.js';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/login', loginLimiter, async (req, res) => {
  const { username, password } = req.body ?? {};
  if (!config.admin.username || !config.admin.passwordHash || !config.admin.jwtSecret) {
    return res.status(503).json({ error: 'admin_not_configured' });
  }
  if (
    typeof username !== 'string' ||
    typeof password !== 'string' ||
    username !== config.admin.username ||
    !verifyAdminPassword(password, config.admin.passwordHash)
  ) {
    return res.status(401).json({ error: 'invalid_credentials' });
  }
  const token = jwt.sign({ admin: true }, config.admin.jwtSecret, { expiresIn: ADMIN_SESSION_TTL_SECONDS });
  setCookie(res, ADMIN_COOKIE, token, { maxAgeSeconds: ADMIN_SESSION_TTL_SECONDS });
  res.status(204).end();
});

router.post('/logout', (req, res) => {
  clearCookie(res, ADMIN_COOKIE);
  res.status(204).end();
});

router.get('/me', requireAdmin, (req, res) => {
  res.json({ username: config.admin.username });
});

router.use(requireAdmin);

// ── helpers ─────────────────────────────────────────────────────────────────

function dateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Fills every day in [today-days+1, today] with 0 for any key missing from a GROUP BY result. */
function fillDailySeries(rows, days, valueKeys) {
  const byDate = new Map(rows.map((r) => [String(r.date).slice(0, 10), r]));
  const out = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = dateKey(d);
    const row = byDate.get(key);
    const entry = { date: key };
    for (const vk of valueKeys) entry[vk] = row ? Number(row[vk]) : 0;
    out.push(entry);
  }
  return out;
}

function clampDays(raw, fallback = 30, max = 180) {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) return fallback;
  return Math.min(n, max);
}

// ── KPI endpoints ───────────────────────────────────────────────────────────

router.get('/overview', async (req, res) => {
  const [
    [[{ totalUsers }]],
    [[{ newUsers7d }]],
    [[{ newUsers30d }]],
    [[{ activeUsers7d }]],
    [[{ totalSessions }]],
    [[{ totalSets }]],
    [[{ onboarded }]],
    [[{ pushOptIn }]],
    [[{ nutritionUsers7d }]],
  ] = await Promise.all([
    pool.query('SELECT COUNT(*) AS totalUsers FROM users'),
    pool.query('SELECT COUNT(*) AS newUsers7d FROM users WHERE created_at >= NOW() - INTERVAL 7 DAY'),
    pool.query('SELECT COUNT(*) AS newUsers30d FROM users WHERE created_at >= NOW() - INTERVAL 30 DAY'),
    pool.query(
      'SELECT COUNT(DISTINCT user_id) AS activeUsers7d FROM sessions WHERE date >= CURDATE() - INTERVAL 7 DAY'
    ),
    pool.query('SELECT COUNT(*) AS totalSessions FROM sessions'),
    pool.query('SELECT COUNT(*) AS totalSets FROM sets'),
    pool.query('SELECT COUNT(*) AS onboarded FROM users WHERE onboarding_completed = 1'),
    pool.query('SELECT COUNT(*) AS pushOptIn FROM users WHERE expo_push_token IS NOT NULL'),
    pool.query(
      'SELECT COUNT(DISTINCT user_id) AS nutritionUsers7d FROM nutrition_entries WHERE date >= CURDATE() - INTERVAL 7 DAY'
    ),
  ]);

  res.json({
    totalUsers,
    newUsers7d,
    newUsers30d,
    activeUsers7d,
    totalSessions,
    totalSets,
    onboardingCompletionRate: totalUsers > 0 ? onboarded / totalUsers : 0,
    pushOptInRate: totalUsers > 0 ? pushOptIn / totalUsers : 0,
    nutritionUsers7d,
  });
});

router.get('/growth', async (req, res) => {
  const days = clampDays(req.query.days);
  const [rows] = await pool.query(
    `SELECT DATE(created_at) AS date, COUNT(*) AS count
     FROM users
     WHERE created_at >= CURDATE() - INTERVAL ? DAY
     GROUP BY DATE(created_at)`,
    [days - 1]
  );
  res.json(fillDailySeries(rows, days, ['count']));
});

router.get('/activity', async (req, res) => {
  const days = clampDays(req.query.days);
  const [rows] = await pool.query(
    `SELECT date, COUNT(*) AS sessions, COUNT(DISTINCT user_id) AS activeUsers
     FROM sessions
     WHERE date >= CURDATE() - INTERVAL ? DAY
     GROUP BY date`,
    [days - 1]
  );
  res.json(fillDailySeries(rows, days, ['sessions', 'activeUsers']));
});

router.get('/rank-distribution', async (req, res) => {
  const seasonInfo = currentSeasonInfo();
  const [rows] = await pool.query(
    `SELECT season_rank AS rank, COUNT(*) AS count
     FROM users
     WHERE season_number = ? AND season_rank IS NOT NULL
     GROUP BY season_rank`,
    [seasonInfo.seasonNumber]
  );
  const byRank = new Map(rows.map((r) => [r.rank, Number(r.count)]));
  res.json(RANKS.map((rank) => ({ rank, count: byRank.get(rank) ?? 0 })));
});

router.get('/top-exercises', async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);
  const [rows] = await pool.query(
    `SELECT exercises.name AS name,
            COUNT(*) AS setsCount,
            COUNT(DISTINCT sessions.user_id) AS usersCount
     FROM sets
     JOIN sessions ON sessions.id = sets.session_id
     JOIN exercises ON exercises.id = sets.exercise_id
     GROUP BY LOWER(TRIM(exercises.name))
     ORDER BY setsCount DESC
     LIMIT ?`,
    [limit]
  );
  res.json(rows.map((r) => ({ name: r.name, setsCount: Number(r.setsCount), usersCount: Number(r.usersCount) })));
});

router.get('/goal-distribution', async (req, res) => {
  const [rows] = await pool.query('SELECT goal, COUNT(*) AS count FROM users GROUP BY goal');
  const byGoal = new Map(rows.map((r) => [r.goal, Number(r.count)]));
  res.json(['cut', 'maintain', 'bulk'].map((goal) => ({ goal, count: byGoal.get(goal) ?? 0 })));
});

router.get('/recent-users', async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
  const [rows] = await pool.query(
    `SELECT u.id, u.username, u.display_name AS displayName, u.created_at AS createdAt,
            u.season_rank AS rank, u.season_division AS division,
            (SELECT COUNT(*) FROM sessions s WHERE s.user_id = u.id) AS sessionsCount,
            (SELECT MAX(date) FROM sessions s WHERE s.user_id = u.id) AS lastSessionDate
     FROM users u
     ORDER BY u.created_at DESC
     LIMIT ?`,
    [limit]
  );
  res.json(rows);
});

router.get('/system', async (req, res) => {
  const [appleStatus, backups] = await Promise.all([
    fs
      .readFile(config.admin.appleStatusFile, 'utf8')
      .then((raw) => JSON.parse(raw))
      .catch(() => null),
    fs
      .readdir(config.admin.backupsDir)
      .then(async (files) => {
        const gz = files.filter((f) => f.endsWith('.sql.gz'));
        if (gz.length === 0) return { count: 0, latest: null, totalBytes: 0 };
        let totalBytes = 0;
        let latest = null;
        for (const f of gz) {
          const stat = await fs.stat(`${config.admin.backupsDir}/${f}`);
          totalBytes += stat.size;
          if (!latest || stat.mtime > latest.mtime) latest = { name: f, mtime: stat.mtime, size: stat.size };
        }
        return { count: gz.length, latest, totalBytes };
      })
      .catch(() => null),
  ]);

  res.json({
    appleReview: appleStatus,
    backups: backups
      ? {
          count: backups.count,
          totalBytes: backups.totalBytes,
          latestAt: backups.latest?.mtime ?? null,
          latestSizeBytes: backups.latest?.size ?? null,
        }
      : null,
  });
});

export default router;
