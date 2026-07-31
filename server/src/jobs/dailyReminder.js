import cron from 'node-cron';
import { pool } from '../db.js';
import { sendExpoPush } from '../utils/push.js';

function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

async function runDailyReminder() {
  const today = todayKey();
  const dow = new Date().getDay(); // 0=dimanche..6=samedi, same convention as the app

  const [users] = await pool.query(
    'SELECT id, training_days, expo_push_token FROM users WHERE expo_push_token IS NOT NULL'
  );

  for (const user of users) {
    const trainingDays = user.training_days ? user.training_days.split(',').filter(Boolean).map(Number) : [];
    if (!trainingDays.includes(dow)) continue;

    const [[existing]] = await pool.query(
      'SELECT id FROM sessions WHERE user_id = ? AND date = ? LIMIT 1',
      [user.id, today]
    );
    if (existing) continue;

    await sendExpoPush(user.expo_push_token, 'Tanren', "C'est un jour d'entraînement — n'oublie pas ta séance !");
  }
}

/** 19:00 server time — late enough that most people have had the chance to train that day. */
export function scheduleDailyReminder() {
  cron.schedule('0 19 * * *', () => {
    runDailyReminder().catch((err) => console.error('[push] daily reminder failed', err));
  });
}
