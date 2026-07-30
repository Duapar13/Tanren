import { ExercisePR, SetWithExercise, WorkoutSession } from '../types';
import { estimate1RM } from './oneRepMax';

function sessionDateMap(sessions: WorkoutSession[]): Map<number, string> {
  const map = new Map<number, string>();
  for (const s of sessions) map.set(s.id, s.date);
  return map;
}

export function computeExercisePRs(
  sets: SetWithExercise[],
  sessions: WorkoutSession[]
): Map<number, ExercisePR> {
  const dateBySession = sessionDateMap(sessions);
  const prs = new Map<number, ExercisePR>();

  // Session volume needs grouping first: (exerciseId, sessionId) -> total volume
  const volumeByExerciseSession = new Map<string, number>();
  for (const s of sets) {
    const key = `${s.exerciseId}:${s.sessionId}`;
    volumeByExerciseSession.set(
      key,
      (volumeByExerciseSession.get(key) ?? 0) + s.weightKg * s.reps
    );
  }

  for (const s of sets) {
    const date = dateBySession.get(s.sessionId) ?? s.createdAt.slice(0, 10);
    const existing = prs.get(s.exerciseId) ?? {
      exerciseId: s.exerciseId,
      maxWeightKg: 0,
      maxWeightDate: date,
      bestEstimated1RM: 0,
      bestEstimated1RMDate: date,
      maxSessionVolume: 0,
      maxSessionVolumeDate: date,
    };

    if (s.weightKg > existing.maxWeightKg) {
      existing.maxWeightKg = s.weightKg;
      existing.maxWeightDate = date;
    }

    const est1RM = estimate1RM(s.weightKg, s.reps);
    if (est1RM > existing.bestEstimated1RM) {
      existing.bestEstimated1RM = est1RM;
      existing.bestEstimated1RMDate = date;
    }

    const sessionVolume =
      volumeByExerciseSession.get(`${s.exerciseId}:${s.sessionId}`) ?? 0;
    if (sessionVolume > existing.maxSessionVolume) {
      existing.maxSessionVolume = sessionVolume;
      existing.maxSessionVolumeDate = date;
    }

    prs.set(s.exerciseId, existing);
  }

  return prs;
}

export interface BrokenPR {
  exerciseId: number;
  exerciseName: string;
  newBest1RM: number;
  previousBest1RM: number;
  date: string;
}

// PRs (par 1RM estimée) battues lors de la séance la plus récente.
export function findRecentPRs(
  sets: SetWithExercise[],
  sessions: WorkoutSession[]
): BrokenPR[] {
  if (sessions.length === 0) return [];
  const dateBySession = sessionDateMap(sessions);
  const mostRecentDate = sessions.reduce(
    (max, s) => (s.date > max ? s.date : max),
    sessions[0].date
  );

  const bestBeforeByExercise = new Map<number, number>();
  const bestDuringByExercise = new Map<number, { value: number; name: string }>();

  for (const s of sets) {
    const date = dateBySession.get(s.sessionId) ?? s.createdAt.slice(0, 10);
    const est1RM = estimate1RM(s.weightKg, s.reps);

    if (date < mostRecentDate) {
      const prev = bestBeforeByExercise.get(s.exerciseId) ?? 0;
      if (est1RM > prev) bestBeforeByExercise.set(s.exerciseId, est1RM);
    } else if (date === mostRecentDate) {
      const prev = bestDuringByExercise.get(s.exerciseId)?.value ?? 0;
      if (est1RM > prev) {
        bestDuringByExercise.set(s.exerciseId, { value: est1RM, name: s.exerciseName });
      }
    }
  }

  const broken: BrokenPR[] = [];
  for (const [exerciseId, during] of bestDuringByExercise) {
    const before = bestBeforeByExercise.get(exerciseId) ?? 0;
    if (during.value > before) {
      broken.push({
        exerciseId,
        exerciseName: during.name,
        newBest1RM: during.value,
        previousBest1RM: before,
        date: mostRecentDate,
      });
    }
  }

  // Trie par marge de progression (1RM battue de combien), pas par 1RM absolue —
  // sinon un exercice déjà lourd écrase toujours les vraies belles progressions du jour.
  return broken.sort(
    (a, b) => b.newBest1RM - b.previousBest1RM - (a.newBest1RM - a.previousBest1RM)
  );
}
