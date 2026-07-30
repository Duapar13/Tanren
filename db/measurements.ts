import type { SQLiteDatabase } from 'expo-sqlite';
import { MeasurementEntry, MeasurementEntryInput } from '../types';

export async function getAllMeasurementEntries(
  db: SQLiteDatabase
): Promise<MeasurementEntry[]> {
  return db.getAllAsync<MeasurementEntry>(
    'SELECT * FROM measurement_entries ORDER BY date DESC, id DESC'
  );
}

export async function insertMeasurementEntry(
  db: SQLiteDatabase,
  input: MeasurementEntryInput
): Promise<number> {
  const now = new Date().toISOString();
  const result = await db.runAsync(
    'INSERT INTO measurement_entries (date, type, valueCm, createdAt) VALUES (?, ?, ?, ?)',
    input.date,
    input.type,
    input.valueCm,
    now
  );
  return result.lastInsertRowId;
}

export async function deleteMeasurementEntry(
  db: SQLiteDatabase,
  id: number
): Promise<void> {
  await db.runAsync('DELETE FROM measurement_entries WHERE id = ?', id);
}
