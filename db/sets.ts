import type { SQLiteDatabase } from 'expo-sqlite';
import { SetEntry, SetEntryInput, SetWithExercise } from '../types';

export async function getAllSets(db: SQLiteDatabase): Promise<SetWithExercise[]> {
  return db.getAllAsync<SetWithExercise>(`
    SELECT
      sets.*,
      exercises.name AS exerciseName,
      exercises.category AS exerciseCategory,
      exercises.muscleGroup AS exerciseMuscleGroup
    FROM sets
    JOIN exercises ON exercises.id = sets.exerciseId
    ORDER BY sets.createdAt ASC
  `);
}

export async function getSetsForSession(
  db: SQLiteDatabase,
  sessionId: number
): Promise<SetWithExercise[]> {
  return db.getAllAsync<SetWithExercise>(
    `SELECT
      sets.*,
      exercises.name AS exerciseName,
      exercises.category AS exerciseCategory,
      exercises.muscleGroup AS exerciseMuscleGroup
    FROM sets
    JOIN exercises ON exercises.id = sets.exerciseId
    WHERE sets.sessionId = ?
    ORDER BY sets.exerciseId ASC, sets.setNumber ASC`,
    sessionId
  );
}

export async function insertSet(
  db: SQLiteDatabase,
  input: SetEntryInput
): Promise<number> {
  const now = new Date().toISOString();
  const result = await db.runAsync(
    'INSERT INTO sets (sessionId, exerciseId, setNumber, reps, weightKg, rpe, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
    input.sessionId,
    input.exerciseId,
    input.setNumber,
    input.reps,
    input.weightKg,
    input.rpe,
    now
  );
  return result.lastInsertRowId;
}

export async function updateSet(
  db: SQLiteDatabase,
  id: number,
  input: Partial<Pick<SetEntry, 'reps' | 'weightKg' | 'rpe'>>
): Promise<void> {
  if (input.reps !== undefined) {
    await db.runAsync('UPDATE sets SET reps = ? WHERE id = ?', input.reps, id);
  }
  if (input.weightKg !== undefined) {
    await db.runAsync('UPDATE sets SET weightKg = ? WHERE id = ?', input.weightKg, id);
  }
  if (input.rpe !== undefined) {
    await db.runAsync('UPDATE sets SET rpe = ? WHERE id = ?', input.rpe, id);
  }
}

export async function deleteSet(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM sets WHERE id = ?', id);
}
