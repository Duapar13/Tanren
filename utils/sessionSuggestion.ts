import { Exercise, SetWithExercise, WorkoutSession } from '../types';

export type SuggestedCategory = 'upper' | 'lower';

export interface SessionSuggestion {
  category: SuggestedCategory;
  /** Exercises of the last session of the same kind, in the order they were done. */
  exerciseIds: number[];
  /** Date (yyyy-mm-dd) of the session the plan is copied from, if any. */
  basedOnDate: string | null;
}

/** Sessions are stored with a generic category, so what a session "was" is inferred from the
 * exercises actually logged in it (upper vs lower body, by majority of sets). */
function dominantCategory(
  sessionId: number,
  sets: SetWithExercise[],
  exercises: Exercise[]
): SuggestedCategory | null {
  let upper = 0;
  let lower = 0;
  for (const s of sets) {
    if (s.sessionId !== sessionId) continue;
    const category = exercises.find((e) => e.id === s.exerciseId)?.category;
    if (category === 'upper') upper++;
    else if (category === 'lower') lower++;
  }
  if (upper === 0 && lower === 0) return null;
  return upper >= lower ? 'upper' : 'lower';
}

/** Upper/lower split: alternate with whatever was trained last, and pre-load the exercises of the
 * last session of that kind so starting is one tap. */
export function suggestSession(
  sessions: WorkoutSession[],
  sets: SetWithExercise[],
  exercises: Exercise[]
): SessionSuggestion {
  const ordered = [...sessions].sort((a, b) => (a.date === b.date ? b.id - a.id : a.date < b.date ? 1 : -1));

  let lastCategory: SuggestedCategory | null = null;
  for (const s of ordered) {
    lastCategory = dominantCategory(s.id, sets, exercises);
    if (lastCategory) break;
  }

  const category: SuggestedCategory = lastCategory === 'upper' ? 'lower' : 'upper';

  for (const s of ordered) {
    if (dominantCategory(s.id, sets, exercises) !== category) continue;
    const seen = new Set<number>();
    const exerciseIds: number[] = [];
    for (const set of sets) {
      if (set.sessionId !== s.id || seen.has(set.exerciseId)) continue;
      const exercise = exercises.find((e) => e.id === set.exerciseId);
      if (!exercise || exercise.deletedAt) continue;
      seen.add(set.exerciseId);
      exerciseIds.push(set.exerciseId);
    }
    if (exerciseIds.length > 0) return { category, exerciseIds, basedOnDate: s.date };
  }

  return { category, exerciseIds: [], basedOnDate: null };
}
