import { pool } from '../db.js';

function toDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Consecutive scheduled training days (per trainingDays) ending today that each have a logged session. */
export async function computeTrainingStreak(userId, trainingDays) {
  if (!trainingDays || trainingDays.length === 0) return 0;
  const [rows] = await pool.query('SELECT DISTINCT date FROM sessions WHERE user_id = ?', [userId]);
  const logged = new Set(rows.map((r) => r.date));

  let streak = 0;
  const cursor = new Date();
  const todayKey = toDateKey(cursor);
  for (let i = 0; i < 400; i++) {
    const key = toDateKey(cursor);
    if (trainingDays.includes(cursor.getDay())) {
      if (logged.has(key)) {
        streak += 1;
      } else if (key < todayKey) {
        break;
      }
    }
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
