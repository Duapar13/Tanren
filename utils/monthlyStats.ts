import { SetWithExercise, WorkoutSession } from '../types';
import { estimate1RM } from './oneRepMax';
import { toDateKey } from './date';

export function monthRange(year: number, month: number): { start: string; end: string } {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  return { start: toDateKey(start), end: toDateKey(end) };
}

export interface MonthlyBest {
  exerciseId: number;
  exerciseName: string;
  est1RM: number;
  date: string;
}

export interface MonthSummary {
  sessionCount: number;
  setCount: number;
  totalVolume: number;
  bestPerformances: MonthlyBest[];
  stagnant: { exerciseId: number; exerciseName: string }[];
}

/** A PR is "in the month" if it beats the best from strictly before the month started. Any
 * exercise trained during the month that never hit a new best counts as stagnant. */
function computeMonthSummary(
  sets: SetWithExercise[],
  sessions: WorkoutSession[],
  start: string,
  end: string
): MonthSummary {
  const dateBySession = new Map(sessions.map((s) => [s.id, s.date]));
  const sorted = [...sets].sort((a, b) => {
    const da = dateBySession.get(a.sessionId) ?? a.createdAt.slice(0, 10);
    const db = dateBySession.get(b.sessionId) ?? b.createdAt.slice(0, 10);
    if (da !== db) return da < db ? -1 : 1;
    return a.id - b.id;
  });

  const sessionCount = new Set(sessions.filter((s) => s.date >= start && s.date <= end).map((s) => s.id)).size;
  let setCount = 0;
  let totalVolume = 0;
  const bestByExercise = new Map<number, number>();
  const bestPerformances: MonthlyBest[] = [];
  const trainedThisMonth = new Map<number, string>();

  for (const s of sorted) {
    const date = dateBySession.get(s.sessionId) ?? s.createdAt.slice(0, 10);
    const inMonth = date >= start && date <= end;
    if (inMonth) {
      setCount += 1;
      totalVolume += s.weightKg * s.reps;
      trainedThisMonth.set(s.exerciseId, s.exerciseName);
    }
    const est = estimate1RM(s.weightKg, s.reps);
    const prevBest = bestByExercise.get(s.exerciseId) ?? 0;
    if (est > prevBest) {
      if (inMonth) {
        bestPerformances.push({ exerciseId: s.exerciseId, exerciseName: s.exerciseName, est1RM: est, date });
      }
      bestByExercise.set(s.exerciseId, est);
    }
  }

  const prExerciseIds = new Set(bestPerformances.map((p) => p.exerciseId));
  const stagnant = [...trainedThisMonth.entries()]
    .filter(([id]) => !prExerciseIds.has(id))
    .map(([exerciseId, exerciseName]) => ({ exerciseId, exerciseName }));

  return { sessionCount, setCount, totalVolume, bestPerformances, stagnant };
}

export interface PeriodAverage {
  avgVolume: number;
  avgSessions: number;
}

function averageOverPastMonths(
  sets: SetWithExercise[],
  sessions: WorkoutSession[],
  year: number,
  month: number,
  monthsBack: number
): PeriodAverage {
  let totalVolume = 0;
  let totalSessions = 0;
  for (let i = 1; i <= monthsBack; i++) {
    const d = new Date(year, month - i, 1);
    const { start, end } = monthRange(d.getFullYear(), d.getMonth());
    const s = computeMonthSummary(sets, sessions, start, end);
    totalVolume += s.totalVolume;
    totalSessions += s.sessionCount;
  }
  return { avgVolume: totalVolume / monthsBack, avgSessions: totalSessions / monthsBack };
}

export interface MonthlyRecap {
  current: MonthSummary;
  previousMonth: MonthSummary;
  avg3Months: PeriodAverage;
  avg6Months: PeriodAverage;
  avg12Months: PeriodAverage;
}

export function computeMonthlyRecap(
  sets: SetWithExercise[],
  sessions: WorkoutSession[],
  year: number,
  month: number
): MonthlyRecap {
  const { start, end } = monthRange(year, month);
  const current = computeMonthSummary(sets, sessions, start, end);
  const prev = new Date(year, month - 1, 1);
  const prevRange = monthRange(prev.getFullYear(), prev.getMonth());

  return {
    current,
    previousMonth: computeMonthSummary(sets, sessions, prevRange.start, prevRange.end),
    avg3Months: averageOverPastMonths(sets, sessions, year, month, 3),
    avg6Months: averageOverPastMonths(sets, sessions, year, month, 6),
    avg12Months: averageOverPastMonths(sets, sessions, year, month, 12),
  };
}
