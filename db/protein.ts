import type { SQLiteDatabase } from 'expo-sqlite';
import { ProteinEntry, ProteinEntryInput } from '../types';

export async function getAllProteinEntries(
  db: SQLiteDatabase
): Promise<ProteinEntry[]> {
  return db.getAllAsync<ProteinEntry>(
    'SELECT * FROM protein_entries ORDER BY date DESC'
  );
}

export async function insertProteinEntry(
  db: SQLiteDatabase,
  input: ProteinEntryInput
): Promise<number> {
  const now = new Date().toISOString();
  const result = await db.runAsync(
    'INSERT INTO protein_entries (date, grams, createdAt) VALUES (?, ?, ?)',
    input.date,
    input.grams,
    now
  );
  return result.lastInsertRowId;
}

export async function deleteProteinEntry(
  db: SQLiteDatabase,
  id: number
): Promise<void> {
  await db.runAsync('DELETE FROM protein_entries WHERE id = ?', id);
}
