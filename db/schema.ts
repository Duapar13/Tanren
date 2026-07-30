import type { SQLiteDatabase } from 'expo-sqlite';

export const DB_NAME = 'tanren.db';
const CURRENT_VERSION = 8;

export async function migrateDb(db: SQLiteDatabase) {
  const row = await db.getFirstAsync<{ user_version: number }>(
    'PRAGMA user_version'
  );
  const currentVersion = row?.user_version ?? 0;
  if (currentVersion >= CURRENT_VERSION) return;

  // Pre-release schema change (v1 -> v2): dropped the tier/onboarding
  // profile table entirely and replaced the seeded exercise library with
  // the user's actual gym exercises. No real training data predates this.
  if (currentVersion > 0 && currentVersion < 2) {
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
      createdAt TEXT NOT NULL,
      serverId INTEGER
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY NOT NULL,
      date TEXT NOT NULL,
      category TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      createdAt TEXT NOT NULL,
      serverId INTEGER
    );

    CREATE TABLE IF NOT EXISTS sets (
      id INTEGER PRIMARY KEY NOT NULL,
      sessionId INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      exerciseId INTEGER NOT NULL REFERENCES exercises(id),
      setNumber INTEGER NOT NULL,
      reps INTEGER NOT NULL DEFAULT 0,
      weightKg REAL NOT NULL DEFAULT 0,
      rpe REAL,
      createdAt TEXT NOT NULL,
      serverId INTEGER
    );

    CREATE TABLE IF NOT EXISTS body_weight_entries (
      id INTEGER PRIMARY KEY NOT NULL,
      date TEXT NOT NULL,
      weightKg REAL NOT NULL,
      createdAt TEXT NOT NULL,
      serverId INTEGER
    );

    CREATE TABLE IF NOT EXISTS nutrition_entries (
      id INTEGER PRIMARY KEY NOT NULL,
      date TEXT NOT NULL,
      proteinG REAL NOT NULL DEFAULT 0,
      carbsG REAL NOT NULL DEFAULT 0,
      fatG REAL NOT NULL DEFAULT 0,
      foodName TEXT,
      grams REAL,
      unit TEXT DEFAULT 'g',
      barcode TEXT,
      createdAt TEXT NOT NULL,
      serverId INTEGER
    );

    CREATE TABLE IF NOT EXISTS measurement_entries (
      id INTEGER PRIMARY KEY NOT NULL,
      date TEXT NOT NULL,
      type TEXT NOT NULL,
      valueCm REAL NOT NULL,
      createdAt TEXT NOT NULL,
      serverId INTEGER
    );

    CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY NOT NULL,
      entity TEXT NOT NULL,
      operation TEXT NOT NULL,
      localId INTEGER NOT NULL,
      serverId INTEGER,
      createdAt TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_date ON sessions (date);
    CREATE INDEX IF NOT EXISTS idx_sets_sessionId ON sets (sessionId);
    CREATE INDEX IF NOT EXISTS idx_sets_exerciseId ON sets (exerciseId);
    CREATE INDEX IF NOT EXISTS idx_bodyweight_date ON body_weight_entries (date);
    CREATE INDEX IF NOT EXISTS idx_nutrition_date ON nutrition_entries (date);
    CREATE INDEX IF NOT EXISTS idx_measurement_type_date ON measurement_entries (type, date);
  `);

  // v2 -> v3: existing installs already have these tables without the
  // serverId column (CREATE TABLE IF NOT EXISTS above is a no-op for them).
  if (currentVersion === 2) {
    for (const table of ['exercises', 'sessions', 'sets', 'body_weight_entries']) {
      await db.execAsync(`ALTER TABLE ${table} ADD COLUMN serverId INTEGER`);
    }
  }

  // v<=3 -> v4: protein-only tracking became full macro tracking. Carry over
  // existing grams as proteinG (carbs/fat start at 0) and drop the old table.
  const proteinTable = await db.getFirstAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'protein_entries'"
  );
  if (proteinTable) {
    try {
      await db.execAsync('ALTER TABLE protein_entries ADD COLUMN serverId INTEGER');
    } catch {
      // column already added by the v2 -> v3 step above
    }
    await db.execAsync(`
      INSERT INTO nutrition_entries (id, date, proteinG, carbsG, fatG, createdAt, serverId)
      SELECT id, date, grams, 0, 0, createdAt, serverId FROM protein_entries;
      DROP TABLE protein_entries;
    `);
  }

  // v<=4 -> v5: no more auto-seeded default library — exercises seeded by an earlier
  // version and already synced to the server (which reassigned them to real accounts)
  // become regular custom exercises locally too, so Profil's library management matches.
  await db.execAsync(
    'UPDATE exercises SET isCustom = 1 WHERE isCustom = 0 AND serverId IS NOT NULL'
  );

  // v<=5 -> v6: nutrition entries can now come from an Open Food Facts lookup.
  if (currentVersion > 0 && currentVersion < 6) {
    for (const column of ['foodName TEXT', 'grams REAL', 'barcode TEXT']) {
      try {
        await db.execAsync(`ALTER TABLE nutrition_entries ADD COLUMN ${column}`);
      } catch {
        // already added by the CREATE TABLE above on a fresh install
      }
    }
  }

  // v<=6 -> v7: liquids are reported by Open Food Facts per 100ml, not 100g.
  if (currentVersion > 0 && currentVersion < 7) {
    try {
      await db.execAsync("ALTER TABLE nutrition_entries ADD COLUMN unit TEXT DEFAULT 'g'");
    } catch {
      // already added by the CREATE TABLE above on a fresh install
    }
  }

  await db.execAsync(`PRAGMA user_version = ${CURRENT_VERSION}`);
}
