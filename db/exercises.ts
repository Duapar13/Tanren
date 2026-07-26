import type { SQLiteDatabase } from 'expo-sqlite';
import { Exercise, ExerciseInput } from '../types';

interface ExerciseRow {
  id: number;
  name: string;
  category: string;
  muscleGroup: string;
  isCustom: number;
  createdAt: string;
}

function mapRow(row: ExerciseRow): Exercise {
  return {
    id: row.id,
    name: row.name,
    category: row.category as Exercise['category'],
    muscleGroup: row.muscleGroup as Exercise['muscleGroup'],
    isCustom: row.isCustom === 1,
    createdAt: row.createdAt,
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

export async function deleteExercise(
  db: SQLiteDatabase,
  id: number
): Promise<void> {
  await db.runAsync('DELETE FROM exercises WHERE id = ?', id);
}
