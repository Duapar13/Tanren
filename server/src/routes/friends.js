import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { sendExpoPush } from '../utils/push.js';

const router = Router();
router.use(requireAuth);

function toDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Monday-start ISO week containing `date`.
function currentWeekRange() {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { weekStart: toDateKey(monday), weekEnd: toDateKey(sunday) };
}

function publicFriend(row) {
  return {
    userId: row.id,
    username: row.username,
    displayName: row.display_name,
    avatarUrl: row.avatar_path ? `/uploads/avatars/${row.avatar_path}` : null,
    seasonPoints: row.season_points,
    seasonRank: row.season_rank,
    seasonDivision: row.season_division,
  };
}

router.get('/', async (req, res) => {
  const [accepted] = await pool.query(
    `SELECT u.id, u.username, u.display_name, u.avatar_path, u.season_points, u.season_rank, u.season_division
     FROM friendships f
     JOIN users u ON u.id = (CASE WHEN f.requester_id = ? THEN f.addressee_id ELSE f.requester_id END)
     WHERE f.status = 'accepted' AND (f.requester_id = ? OR f.addressee_id = ?)`,
    [req.userId, req.userId, req.userId]
  );

  const [incoming] = await pool.query(
    `SELECT f.id, u.id AS fromUserId, u.username AS fromUsername, u.display_name AS fromDisplayName
     FROM friendships f
     JOIN users u ON u.id = f.requester_id
     WHERE f.addressee_id = ? AND f.status = 'pending'`,
    [req.userId]
  );

  const [outgoing] = await pool.query(
    `SELECT f.id, u.id AS toUserId, u.username AS toUsername
     FROM friendships f
     JOIN users u ON u.id = f.addressee_id
     WHERE f.requester_id = ? AND f.status = 'pending'`,
    [req.userId]
  );

  res.json({
    friends: accepted.map(publicFriend),
    incomingRequests: incoming,
    outgoingRequests: outgoing,
  });
});

router.post('/requests', async (req, res) => {
  const { username } = req.body ?? {};
  if (!username || typeof username !== 'string' || !username.trim()) {
    return res.status(400).json({ error: 'invalid_username' });
  }

  const [[target]] = await pool.query('SELECT id, expo_push_token, username FROM users WHERE username = ?', [
    username.trim(),
  ]);
  if (!target) return res.status(404).json({ error: 'user_not_found' });
  if (target.id === req.userId) return res.status(400).json({ error: 'cannot_friend_self' });

  const [[existing]] = await pool.query(
    `SELECT id, requester_id AS requesterId, status FROM friendships
     WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)`,
    [req.userId, target.id, target.id, req.userId]
  );

  if (existing) {
    if (existing.status === 'accepted') return res.status(409).json({ error: 'already_friends' });
    // Reverse direction already pending (both sent a request around the same time) — treat as
    // a mutual accept instead of erroring or creating a confusing second pending row.
    if (existing.requesterId !== req.userId) {
      await pool.query("UPDATE friendships SET status = 'accepted', responded_at = NOW() WHERE id = ?", [
        existing.id,
      ]);
      return res.status(200).json({ id: existing.id, status: 'accepted' });
    }
    return res.status(409).json({ error: 'request_already_sent' });
  }

  const [result] = await pool.query('INSERT INTO friendships (requester_id, addressee_id) VALUES (?, ?)', [
    req.userId,
    target.id,
  ]);

  if (target.expo_push_token) {
    const [[me]] = await pool.query('SELECT username FROM users WHERE id = ?', [req.userId]);
    sendExpoPush(target.expo_push_token, 'Nouvelle demande d’ami 👋', `${me.username} veut t’ajouter sur Ningyma`).catch(
      () => {}
    );
  }

  res.status(201).json({ id: result.insertId, status: 'pending' });
});

router.post('/requests/:id/accept', async (req, res) => {
  const [result] = await pool.query(
    "UPDATE friendships SET status = 'accepted', responded_at = NOW() WHERE id = ? AND addressee_id = ? AND status = 'pending'",
    [req.params.id, req.userId]
  );
  if (result.affectedRows === 0) return res.status(404).json({ error: 'not_found' });
  res.status(204).end();
});

// Declines an incoming request or cancels one this user sent — either party on a pending
// request can remove it.
router.delete('/requests/:id', async (req, res) => {
  const [result] = await pool.query(
    "DELETE FROM friendships WHERE id = ? AND (requester_id = ? OR addressee_id = ?) AND status = 'pending'",
    [req.params.id, req.userId, req.userId]
  );
  if (result.affectedRows === 0) return res.status(404).json({ error: 'not_found' });
  res.status(204).end();
});

router.delete('/:userId', async (req, res) => {
  const [result] = await pool.query(
    `DELETE FROM friendships
     WHERE status = 'accepted'
       AND ((requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?))`,
    [req.userId, req.params.userId, req.params.userId, req.userId]
  );
  if (result.affectedRows === 0) return res.status(404).json({ error: 'not_found' });
  res.status(204).end();
});

// Session count + volume for the current Monday-Sunday week, for the caller and one friend
// side by side — deliberately NOT reusing the full ranking engine (nutrition/measurements/goal)
// so comparing a training-frequency challenge with a friend never needs their private diet or
// body-measurement data, only what's already effectively public via the leaderboard.
router.get('/:userId/week', async (req, res) => {
  const friendId = Number(req.params.userId);
  const [[friendship]] = await pool.query(
    `SELECT id FROM friendships
     WHERE status = 'accepted'
       AND ((requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?))`,
    [req.userId, friendId, friendId, req.userId]
  );
  if (!friendship) return res.status(403).json({ error: 'not_friends' });

  const { weekStart, weekEnd } = currentWeekRange();

  async function weekStats(userId) {
    const [[row]] = await pool.query(
      `SELECT COUNT(DISTINCT s.date) AS sessionCount, COALESCE(SUM(st.weight_kg * st.reps), 0) AS totalVolume
       FROM sessions s
       LEFT JOIN sets st ON st.session_id = s.id
       WHERE s.user_id = ? AND s.date BETWEEN ? AND ?`,
      [userId, weekStart, weekEnd]
    );
    return { sessionCount: row.sessionCount, totalVolume: Number(row.totalVolume) };
  }

  const [me, friend] = await Promise.all([weekStats(req.userId), weekStats(friendId)]);
  res.json({ weekStart, weekEnd, me, friend });
});

export default router;
