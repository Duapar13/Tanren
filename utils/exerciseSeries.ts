import { SetWithExercise, WorkoutSession } from '../types';
import { estimate1RM } from './oneRepMax';

export interface ExerciseSessionPoint {
  date: string;
  maxWeightKg: number;
  volume: number;
  best1RM: number;
}

export function computeExerciseSeries(
  exerciseId: number,
  sets: SetWithExercise[],
  sessions: WorkoutSession[]
): ExerciseSessionPoint[] {
  const dateBySession = new Map(sessions.map((s) => [s.id, s.date]));
  const bySession = new Map<number, ExerciseSessionPoint & { sessionId: number }>();

  for (const s of sets) {
    if (s.exerciseId !== exerciseId) continue;
    const date = dateBySession.get(s.sessionId) ?? s.createdAt.slice(0, 10);
    const existing = bySession.get(s.sessionId) ?? {
      sessionId: s.sessionId,
      date,
      maxWeightKg: 0,
      volume: 0,
      best1RM: 0,
    };
    existing.maxWeightKg = Math.max(existing.maxWeightKg, s.weightKg);
    existing.volume += s.weightKg * s.reps;
    existing.best1RM = Math.max(existing.best1RM, estimate1RM(s.weightKg, s.reps));
    bySession.set(s.sessionId, existing);
  }

  return Array.from(bySession.values()).sort((a, b) => (a.date < b.date ? -1 : 1));
}
