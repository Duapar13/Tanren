import {
  BodyWeightEntry,
  NutritionEntry,
  NutritionGoal,
  SetWithExercise,
  SplitType,
  WorkoutSession,
} from '../types';
import { addDays, toDateKey, todayKey } from './date';
import { getSessionTypeForDate, SPLIT_DAY_LABELS } from './program';
import { estimate1RM } from './oneRepMax';
import { macroTargets } from './nutrition';
import { latestBodyWeight } from './nutritionStats';

export const RANKS = ['Fer', 'Bronze', 'Acier', 'Argent', 'Or', 'Légende'] as const;
export type RankName = (typeof RANKS)[number];

export const DIVISIONS = ['IV', 'III', 'II', 'I'] as const;
export type Division = (typeof DIVISIONS)[number];

export const POINTS_PER_DIVISION = 100;
export const TOTAL_TIERS = RANKS.length * DIVISIONS.length; // 24
export const MAX_POINTS = TOTAL_TIERS * POINTS_PER_DIVISION;

export const RANK_COLORS: Record<RankName, string> = {
  Fer: '#8A8A8E',
  Bronze: '#B08D57',
  Acier: '#7C8B9C',
  Argent: '#C7C9CC',
  Or: '#C4881F',
  Légende: '#B15CDE',
};

export interface RankState {
  totalPoints: number;
  rank: RankName;
  division: Division;
  tierIndex: number; // 0..23
  pointsInDivision: number; // 0..99
  isMaxTier: boolean;
}

export function tierFromPoints(rawPoints: number): RankState {
  const totalPoints = Math.max(0, Math.min(Math.round(rawPoints), MAX_POINTS - 1));
  const tierIndex = Math.floor(totalPoints / POINTS_PER_DIVISION);
  const rank = RANKS[Math.floor(tierIndex / DIVISIONS.length)];
  const division = DIVISIONS[tierIndex % DIVISIONS.length];
  const pointsInDivision = totalPoints % POINTS_PER_DIVISION;
  return {
    totalPoints,
    rank,
    division,
    tierIndex,
    pointsInDivision,
    isMaxTier: tierIndex === TOTAL_TIERS - 1,
  };
}

export function currentSeasonId(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function seasonLabel(seasonId: string): string {
  const [y, m] = seasonId.split('-').map(Number);
  const label = new Date(y, m - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function daysUntilNextSeason(date = new Date()): number {
  const nextMonth = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return Math.ceil((nextMonth.getTime() - date.getTime()) / (24 * 60 * 60 * 1000));
}

export interface RankEvent {
  date: string;
  label: string;
  points: number;
  source: 'streak' | 'pr' | 'nutrition';
}

function computeStreakEvents(
  sessions: WorkoutSession[],
  trainingDays: number[],
  splitType: SplitType,
  monthStart: string,
  today: string
): RankEvent[] {
  if (trainingDays.length === 0) return [];
  const loggedDates = new Set(sessions.map((s) => s.date));
  const events: RankEvent[] = [];
  let cursor = new Date(`${monthStart}T00:00:00`);
  let cursorKey = toDateKey(cursor);
  while (cursorKey <= today) {
    const type = getSessionTypeForDate(cursor, trainingDays, splitType);
    if (type !== 'rest') {
      if (loggedDates.has(cursorKey)) {
        events.push({
          date: cursorKey,
          label: `Séance loggée · ${SPLIT_DAY_LABELS[type]}`,
          points: 10,
          source: 'streak',
        });
      } else if (cursorKey < today) {
        events.push({ date: cursorKey, label: 'Séance planifiée manquée', points: -15, source: 'streak' });
      }
    }
    cursor = addDays(cursor, 1);
    cursorKey = toDateKey(cursor);
  }
  return events;
}

function computePRPoints(
  sets: SetWithExercise[],
  sessions: WorkoutSession[],
  monthStart: string,
  today: string
): RankEvent[] {
  const dateBySession = new Map(sessions.map((s) => [s.id, s.date]));
  const sorted = [...sets].sort((a, b) => {
    const da = dateBySession.get(a.sessionId) ?? a.createdAt.slice(0, 10);
    const db = dateBySession.get(b.sessionId) ?? b.createdAt.slice(0, 10);
    if (da !== db) return da < db ? -1 : 1;
    return a.id - b.id;
  });

  const bestByExercise = new Map<number, number>();
  const events: RankEvent[] = [];
  for (const s of sorted) {
    const date = dateBySession.get(s.sessionId) ?? s.createdAt.slice(0, 10);
    const est = estimate1RM(s.weightKg, s.reps);
    const prevBest = bestByExercise.get(s.exerciseId) ?? 0;
    if (est > prevBest) {
      if (date >= monthStart && date <= today) {
        const points =
          prevBest === 0 ? 15 : Math.min(40, 10 + Math.round(((est - prevBest) / prevBest) * 100));
        events.push({ date, label: `Record battu · ${s.exerciseName}`, points, source: 'pr' });
      }
      bestByExercise.set(s.exerciseId, est);
    }
  }
  return events;
}

function computeNutritionEvents(
  nutritionEntries: NutritionEntry[],
  bodyWeightEntries: BodyWeightEntry[],
  goal: NutritionGoal,
  monthStart: string,
  today: string
): RankEvent[] {
  const currentWeight = latestBodyWeight(bodyWeightEntries);
  if (!currentWeight) return [];
  const targets = macroTargets(currentWeight, goal);

  const caloriesByDate = new Map<string, number>();
  for (const e of nutritionEntries) {
    if (e.date < monthStart || e.date >= today) continue; // journée du jour pas encore terminée
    const calories = e.proteinG * 4 + e.carbsG * 4 + e.fatG * 9;
    caloriesByDate.set(e.date, (caloriesByDate.get(e.date) ?? 0) + calories);
  }

  const events: RankEvent[] = [];
  for (const [date, calories] of caloriesByDate) {
    const ratio = calories / targets.calories;
    if (ratio >= 0.85 && ratio <= 1.15) {
      events.push({ date, label: 'Objectif nutrition atteint', points: 5, source: 'nutrition' });
    }
  }
  return events;
}

export interface SeasonRanking {
  seasonId: string;
  totalPoints: number;
  state: RankState;
  events: RankEvent[];
  breakdown: { streak: number; pr: number; nutrition: number };
}

export function computeSeasonRanking(params: {
  sessions: WorkoutSession[];
  sets: SetWithExercise[];
  nutritionEntries: NutritionEntry[];
  bodyWeightEntries: BodyWeightEntry[];
  trainingDays: number[];
  splitType: SplitType;
  goal: NutritionGoal;
}): SeasonRanking {
  const today = todayKey();
  const monthStart = `${today.slice(0, 7)}-01`;

  const streakEvents = computeStreakEvents(params.sessions, params.trainingDays, params.splitType, monthStart, today);
  const prEvents = computePRPoints(params.sets, params.sessions, monthStart, today);
  const nutritionEvents = computeNutritionEvents(
    params.nutritionEntries,
    params.bodyWeightEntries,
    params.goal,
    monthStart,
    today
  );

  const events = [...streakEvents, ...prEvents, ...nutritionEvents].sort((a, b) =>
    a.date === b.date ? 0 : a.date < b.date ? 1 : -1
  );
  const totalPoints = events.reduce((sum, e) => sum + e.points, 0);

  return {
    seasonId: currentSeasonId(),
    totalPoints,
    state: tierFromPoints(totalPoints),
    events,
    breakdown: {
      streak: streakEvents.reduce((s, e) => s + e.points, 0),
      pr: prEvents.reduce((s, e) => s + e.points, 0),
      nutrition: nutritionEvents.reduce((s, e) => s + e.points, 0),
    },
  };
}
