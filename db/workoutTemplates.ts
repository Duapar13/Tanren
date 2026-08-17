import type { SQLiteDatabase } from 'expo-sqlite';
import { WorkoutTemplate, WorkoutTemplateInput } from '../types';

export async function getAllWorkoutTemplates(db: SQLiteDatabase): Promise<WorkoutTemplate[]> {
  const templates = await db.getAllAsync<{
    id: number;
    name: string;
    createdAt: string;
    deletedAt: string | null;
  }>('SELECT id, name, createdAt, deletedAt FROM workout_templates WHERE deletedAt IS NULL ORDER BY createdAt DESC');

  const links = await db.getAllAsync<{ templateId: number; exerciseId: number }>(
    'SELECT templateId, exerciseId FROM workout_template_exercises ORDER BY templateId, orderIndex'
  );
  const exerciseIdsByTemplate = new Map<number, number[]>();
  for (const link of links) {
    const list = exerciseIdsByTemplate.get(link.templateId) ?? [];
    list.push(link.exerciseId);
    exerciseIdsByTemplate.set(link.templateId, list);
  }

  return templates.map((t) => ({
    ...t,
    exerciseIds: exerciseIdsByTemplate.get(t.id) ?? [],
  }));
}

export async function insertWorkoutTemplate(
  db: SQLiteDatabase,
  input: WorkoutTemplateInput
): Promise<number> {
  const now = new Date().toISOString();
  let templateId!: number;
  await db.withTransactionAsync(async () => {
    const result = await db.runAsync(
      'INSERT INTO workout_templates (name, createdAt) VALUES (?, ?)',
      input.name,
      now
    );
    templateId = result.lastInsertRowId;
    for (let i = 0; i < input.exerciseIds.length; i++) {
      await db.runAsync(
        'INSERT INTO workout_template_exercises (templateId, exerciseId, orderIndex) VALUES (?, ?, ?)',
        templateId,
        input.exerciseIds[i],
        i
      );
    }
  });
  return templateId;
}

// Hard delete: unlike exercises, a template is just a saved shortcut with no historical record
// that needs to survive it — nothing else references a template by id.
export async function deleteWorkoutTemplate(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM workout_templates WHERE id = ?', id);
}
