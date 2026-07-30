import type { SQLiteDatabase } from 'expo-sqlite';
import { NutritionEntry, NutritionEntryInput } from '../types';

export async function getAllNutritionEntries(
  db: SQLiteDatabase
): Promise<NutritionEntry[]> {
  return db.getAllAsync<NutritionEntry>(
    'SELECT * FROM nutrition_entries ORDER BY date DESC, id DESC'
  );
}

export async function insertNutritionEntry(
  db: SQLiteDatabase,
  input: NutritionEntryInput
): Promise<number> {
  const now = new Date().toISOString();
  const result = await db.runAsync(
    'INSERT INTO nutrition_entries (date, proteinG, carbsG, fatG, foodName, grams, unit, barcode, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    input.date,
    input.proteinG,
    input.carbsG,
    input.fatG,
    input.foodName,
    input.grams,
    input.unit,
    input.barcode,
    now
  );
  return result.lastInsertRowId;
}

export async function updateNutritionEntry(
  db: SQLiteDatabase,
  id: number,
  input: Partial<Pick<NutritionEntry, 'proteinG' | 'carbsG' | 'fatG' | 'grams'>>
): Promise<void> {
  if (input.proteinG !== undefined) {
    await db.runAsync('UPDATE nutrition_entries SET proteinG = ? WHERE id = ?', input.proteinG, id);
  }
  if (input.carbsG !== undefined) {
    await db.runAsync('UPDATE nutrition_entries SET carbsG = ? WHERE id = ?', input.carbsG, id);
  }
  if (input.fatG !== undefined) {
    await db.runAsync('UPDATE nutrition_entries SET fatG = ? WHERE id = ?', input.fatG, id);
  }
  if (input.grams !== undefined) {
    await db.runAsync('UPDATE nutrition_entries SET grams = ? WHERE id = ?', input.grams, id);
  }
}

export async function deleteNutritionEntry(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM nutrition_entries WHERE id = ?', id);
}
