import type { SQLiteDatabase } from 'expo-sqlite';
import { WorkoutSession, WorkoutSessionInput } from '../types';

export async function getAllSessions(
  db: SQLiteDatabase
): Promise<WorkoutSession[]> {
  return db.getAllAsync<WorkoutSession>(
    'SELECT * FROM sessions ORDER BY date DESC, id DESC'
  );
}

export async function getSessionById(
  db: SQLiteDatabase,
  id: number
): Promise<WorkoutSession | null> {
  const row = await db.getFirstAsync<WorkoutSession>(
    'SELECT * FROM sessions WHERE id = ?',
    id
  );
  return row ?? null;
}

export async function insertSession(
  db: SQLiteDatabase,
  input: WorkoutSessionInput
): Promise<number> {
  const now = new Date().toISOString();
  const result = await db.runAsync(
    'INSERT INTO sessions (date, category, notes, createdAt) VALUES (?, ?, ?, ?)',
    input.date,
    input.category,
    input.notes,
    now
  );
  return result.lastInsertRowId;
}

export async function deleteSession(
  db: SQLiteDatabase,
  id: number
): Promise<void> {
  await db.runAsync('DELETE FROM sets WHERE sessionId = ?', id);
  await db.runAsync('DELETE FROM sessions WHERE id = ?', id);
}
