import type { SQLiteDatabase } from 'expo-sqlite';
import { DEFAULT_EXERCISES } from '../constants/exercises';

export const DB_NAME = 'tanren.db';
const CURRENT_VERSION = 2;

export async function migrateDb(db: SQLiteDatabase) {
  const row = await db.getFirstAsync<{ user_version: number }>(
    'PRAGMA user_version'
  );
  const currentVersion = row?.user_version ?? 0;
  if (currentVersion >= CURRENT_VERSION) return;

  // Pre-release schema change (v1 -> v2): dropped the tier/onboarding
  // profile table entirely and replaced the seeded exercise library with
  // the user's actual gym exercises. No real training data predates this.
  if (currentVersion > 0 && currentVersion < CURRENT_VERSION) {
    await db.execAsync(`
      DROP TABLE IF EXISTS sets;
      DROP TABLE IF EXISTS sessions;
      DROP TABLE IF EXISTS exercises;
      DROP TABLE IF EXISTS profile;
    `);
  }

  await db.execAsync(`
    PRAGMA journal_mode = 'wal';

    CREATE TABLE IF NOT EXISTS exercises (
      id INTEGER PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      muscleGroup TEXT NOT NULL,
      isCustom INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY NOT NULL,
      date TEXT NOT NULL,
      category TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sets (
      id INTEGER PRIMARY KEY NOT NULL,
      sessionId INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      exerciseId INTEGER NOT NULL REFERENCES exercises(id),
      setNumber INTEGER NOT NULL,
      reps INTEGER NOT NULL DEFAULT 0,
      weightKg REAL NOT NULL DEFAULT 0,
      rpe REAL,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS body_weight_entries (
      id INTEGER PRIMARY KEY NOT NULL,
      date TEXT NOT NULL,
      weightKg REAL NOT NULL,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS protein_entries (
      id INTEGER PRIMARY KEY NOT NULL,
      date TEXT NOT NULL,
      grams REAL NOT NULL,
      createdAt TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_date ON sessions (date);
    CREATE INDEX IF NOT EXISTS idx_sets_sessionId ON sets (sessionId);
    CREATE INDEX IF NOT EXISTS idx_sets_exerciseId ON sets (exerciseId);
    CREATE INDEX IF NOT EXISTS idx_bodyweight_date ON body_weight_entries (date);
    CREATE INDEX IF NOT EXISTS idx_protein_date ON protein_entries (date);
  `);

  const exerciseCount = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM exercises'
  );
  if (!exerciseCount || exerciseCount.count === 0) {
    const now = new Date().toISOString();
    for (const ex of DEFAULT_EXERCISES) {
      await db.runAsync(
        'INSERT INTO exercises (name, category, muscleGroup, isCustom, createdAt) VALUES (?, ?, ?, 0, ?)',
        ex.name,
        ex.category,
        ex.muscleGroup,
        now
      );
    }
  }

  await db.execAsync(`PRAGMA user_version = ${CURRENT_VERSION}`);
}
