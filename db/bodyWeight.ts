import type { SQLiteDatabase } from 'expo-sqlite';
import { BodyWeightEntry, BodyWeightEntryInput } from '../types';

export async function getAllBodyWeightEntries(
  db: SQLiteDatabase
): Promise<BodyWeightEntry[]> {
  return db.getAllAsync<BodyWeightEntry>(
    'SELECT * FROM body_weight_entries ORDER BY date DESC'
  );
}

export async function insertBodyWeightEntry(
  db: SQLiteDatabase,
  input: BodyWeightEntryInput
): Promise<number> {
  const now = new Date().toISOString();
  const result = await db.runAsync(
    'INSERT INTO body_weight_entries (date, weightKg, createdAt) VALUES (?, ?, ?)',
    input.date,
    input.weightKg,
    now
  );
  return result.lastInsertRowId;
}

export async function deleteBodyWeightEntry(
  db: SQLiteDatabase,
  id: number
): Promise<void> {
  await db.runAsync('DELETE FROM body_weight_entries WHERE id = ?', id);
}
