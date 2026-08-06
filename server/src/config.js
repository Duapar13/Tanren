import 'dotenv/config';

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 8095),
  db: {
    host: required('DB_HOST', '127.0.0.1'),
    user: required('DB_USER'),
    password: required('DB_PASSWORD'),
    database: required('DB_NAME'),
  },
  jwt: {
    accessSecret: required('JWT_ACCESS_SECRET'),
    refreshSecret: required('JWT_REFRESH_SECRET'),
    accessTtl: '15m',
    refreshTtlDays: 30,
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID ?? null,
  },
  apple: {
    clientId: process.env.APPLE_CLIENT_ID ?? null,
  },
  corsOrigins: (process.env.CORS_ORIGINS ?? '*').split(',').map((s) => s.trim()),
  admin: {
    username: process.env.ADMIN_USERNAME ?? null,
    passwordHash: process.env.ADMIN_PASSWORD_HASH ?? null,
    jwtSecret: process.env.ADMIN_JWT_SECRET ?? null,
    // Same box as the API (pm2 runs it as the `tanren` user) — read directly off disk
    // rather than re-implementing what backup-db.sh / check-review-status.js already track.
    backupsDir: process.env.ADMIN_BACKUPS_DIR ?? '/home/tanren/backups/db',
    appleStatusFile: process.env.ADMIN_APPLE_STATUS_FILE ?? '/home/tanren/backups/apple-status-state.json',
  },
};
