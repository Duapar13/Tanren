import type { SQLiteDatabase } from 'expo-sqlite';
import { Exercise, ExerciseInput } from '../types';

interface ExerciseRow {
  id: number;
  name: string;
  category: string;
  muscleGroup: string;
  isCustom: number;
  createdAt: string;
  deletedAt: string | null;
}

function mapRow(row: ExerciseRow): Exercise {
  return {
    id: row.id,
    name: row.name,
    category: row.category as Exercise['category'],
    muscleGroup: row.muscleGroup as Exercise['muscleGroup'],
    isCustom: row.isCustom === 1,
    createdAt: row.createdAt,
    deletedAt: row.deletedAt,
  };
}

export async function getAllExercises(db: SQLiteDatabase): Promise<Exercise[]> {
  const rows = await db.getAllAsync<ExerciseRow>(
    'SELECT * FROM exercises ORDER BY name ASC'
  );
  return rows.map(mapRow);
}

export async function insertExercise(
  db: SQLiteDatabase,
  input: ExerciseInput
): Promise<number> {
  const now = new Date().toISOString();
  const result = await db.runAsync(
    'INSERT INTO exercises (name, category, muscleGroup, isCustom, createdAt) VALUES (?, ?, ?, ?, ?)',
    input.name,
    input.category,
    input.muscleGroup,
    input.isCustom ? 1 : 0,
    now
  );
  return result.lastInsertRowId;
}

export async function updateExercise(
  db: SQLiteDatabase,
  id: number,
  input: Partial<Pick<Exercise, 'name' | 'category'>>
): Promise<void> {
  if (input.name !== undefined) {
    await db.runAsync('UPDATE exercises SET name = ? WHERE id = ?', input.name, id);
  }
  if (input.category !== undefined) {
    await db.runAsync('UPDATE exercises SET category = ? WHERE id = ?', input.category, id);
  }
}

// Soft delete: sets keep referencing this exerciseId (see db/sets.ts's getAllSets comment),
// so removing the row outright would strip the real exercise name from historical sets.
export async function deleteExercise(
  db: SQLiteDatabase,
  id: number
): Promise<void> {
  await db.runAsync(
    'UPDATE exercises SET deletedAt = ? WHERE id = ?',
    new Date().toISOString(),
    id
  );
}
