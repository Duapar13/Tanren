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
    'SELECT id, training_days, expo_push_token FROM users WHERE expo_push_token IS NOT NULL AND daily_reminder_enabled = 1'
  );
  console.log(`[push] daily reminder run at ${new Date().toISOString()} — ${users.length} user(s) with a token`);

  for (const user of users) {
    const trainingDays = user.training_days ? user.training_days.split(',').filter(Boolean).map(Number) : [];
    if (!trainingDays.includes(dow)) continue;

    const [[existing]] = await pool.query(
      'SELECT id FROM sessions WHERE user_id = ? AND date = ? LIMIT 1',
      [user.id, today]
    );
    if (existing) continue;

    console.log(`[push] reminder eligible: user ${user.id}`);
    await sendExpoPush(user.expo_push_token, 'Ningyma', "C'est un jour d'entraînement — n'oublie pas ta séance !");
  }
}

/** 19:00 server time — late enough that most people have had the chance to train that day. */
export function scheduleDailyReminder() {
  console.log('[push] daily reminder cron registered (0 19 * * *)');
  cron.schedule('0 19 * * *', () => {
    runDailyReminder().catch((err) => console.error('[push] daily reminder failed', err));
  });
}
