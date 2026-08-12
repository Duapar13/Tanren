import {
  BodyWeightEntry,
  MeasurementEntry,
  MeasurementType,
  MEASUREMENT_TYPE_LABELS,
  NutritionEntry,
  NutritionGoal,
  SetWithExercise,
  WorkoutSession,
} from '../types';
import { addDays, toDateKey, todayKey } from './date';
import { isTrainingDay } from './program';
import { estimate1RM } from './oneRepMax';
import { macroTargets } from './nutrition';
import { latestBodyWeight } from './nutritionStats';

export const RANKS = [
  'Fer',
  'Bronze',
  'Acier',
  'Argent',
  'Or',
  'Améthyste',
  'Émeraude',
  'Rubis',
  'Saphir',
  'Diamant',
  'Légende',
  'Divin',
] as const;
export type RankName = (typeof RANKS)[number];

export const DIVISIONS = ['IV', 'III', 'II', 'I'] as const;
export type Division = (typeof DIVISIONS)[number];

export const POINTS_PER_DIVISION = 100;
export const TOTAL_TIERS = RANKS.length * DIVISIONS.length; // 48
export const MAX_POINTS = TOTAL_TIERS * POINTS_PER_DIVISION;

export const RANK_COLORS: Record<RankName, string> = {
  Fer: '#8A8A8E',
  Bronze: '#B08D57',
  Acier: '#7C8B9C',
  Argent: '#C7C9CC',
  Or: '#C4881F',
  Améthyste: '#8B5FBF',
  Émeraude: '#17A673',
  Rubis: '#D7263D',
  Saphir: '#2E6FE0',
  Diamant: '#5FD0D9',
  Légende: '#B15CDE',
  Divin: '#F2C744',
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

// Seasons are calendar half-years (Jan-Jun / Jul-Dec), numbered globally so everyone's
// "Season N" means the same real-world period. The epoch is pinned so the season we're
// in right now is Season 1 — earlier half-years would count down from there (unused).
const SEASON_EPOCH_YEAR = 2026;
const SEASON_EPOCH_HALF: 1 | 2 = 2;
const SEASON_EPOCH_HALF_INDEX = SEASON_EPOCH_YEAR * 2 + (SEASON_EPOCH_HALF - 1);

export interface SeasonInfo {
  seasonNumber: number;
  half: 1 | 2;
  year: number;
  startDate: string; // yyyy-mm-01
  endDate: string; // yyyy-mm-dd, last day of the 6th month
}

function halfIndexForDate(date: Date): number {
  const year = date.getFullYear();
  const half: 1 | 2 = date.getMonth() < 6 ? 1 : 2;
  return year * 2 + (half - 1);
}

function seasonInfoForHalfIndex(halfIndex: number): SeasonInfo {
  const year = Math.floor(halfIndex / 2);
  const half: 1 | 2 = ((halfIndex % 2) + 1) as 1 | 2;
  const seasonNumber = halfIndex - SEASON_EPOCH_HALF_INDEX + 1;
  const startMonth = half === 1 ? 0 : 6;
  const start = new Date(year, startMonth, 1);
  const end = new Date(year, startMonth + 6, 0); // day 0 of the month after = last day of the 6th month
  return {
    seasonNumber,
    half,
    year,
    startDate: toDateKey(start),
    endDate: toDateKey(end),
  };
}

export function seasonInfoForDate(date: Date): SeasonInfo {
  return seasonInfoForHalfIndex(halfIndexForDate(date));
}

export function currentSeasonInfo(date = new Date()): SeasonInfo {
  return seasonInfoForDate(date);
}

export function seasonInfoForNumber(seasonNumber: number): SeasonInfo {
  return seasonInfoForHalfIndex(seasonNumber - 1 + SEASON_EPOCH_HALF_INDEX);
}

export function seasonLabel(info: SeasonInfo): string {
  return `Saison ${info.seasonNumber}`;
}

export function daysUntilNextSeason(date = new Date()): number {
  const info = seasonInfoForDate(date);
  const end = new Date(`${info.endDate}T00:00:00`);
  const next = addDays(end, 1);
  return Math.ceil((next.getTime() - date.getTime()) / (24 * 60 * 60 * 1000));
}

export interface RankEvent {
  date: string;
  label: string;
  points: number;
  source: 'streak' | 'pr' | 'nutrition' | 'measurement';
}

function computeStreakEvents(
  sessions: WorkoutSession[],
  trainingDays: number[],
  accountCreatedAt: string,
  rangeStart: string,
  rangeEnd: string
): RankEvent[] {
  if (trainingDays.length === 0) return [];
  const loggedDates = new Set(sessions.map((s) => s.date));
  const events: RankEvent[] = [];
  // Never penalize days before the account existed — a brand-new user shouldn't inherit
  // "missed" days from earlier in the season just because the season started before they signed up.
  const effectiveStart = rangeStart < accountCreatedAt ? accountCreatedAt : rangeStart;
  let cursor = new Date(`${effectiveStart}T00:00:00`);
  let cursorKey = toDateKey(cursor);
  const today = todayKey();
  while (cursorKey <= rangeEnd) {
    if (isTrainingDay(cursor, trainingDays)) {
      if (loggedDates.has(cursorKey)) {
        events.push({ date: cursorKey, label: 'Séance loggée', points: 10, source: 'streak' });
      } else if (cursorKey < today) {
        events.push({ date: cursorKey, label: 'Séance planifiée manquée', points: -15, source: 'streak' });
      }
    }
    cursor = addDays(cursor, 1);
    cursorKey = toDateKey(cursor);
  }
  return events;
}

interface SessionExerciseBest {
  date: string;
  exerciseId: number;
  exerciseName: string;
  est: number;
}

/**
 * PRs are compared session-to-session, not set-to-set: a session's best estimated 1RM per
 * exercise is measured against the best from earlier sessions only. This avoids a single
 * session (especially the very first one, or a pyramid set that gets heavier each set)
 * generating a stack of "PRs" against itself — there's nothing to have "broken" yet the
 * first time an exercise is ever logged, so that session just sets the baseline.
 */
function computePRPoints(
  sets: SetWithExercise[],
  sessions: WorkoutSession[],
  rangeStart: string,
  rangeEnd: string
): RankEvent[] {
  const dateBySession = new Map(sessions.map((s) => [s.id, s.date]));

  const bestBySessionExercise = new Map<string, SessionExerciseBest>();
  for (const s of sets) {
    const date = dateBySession.get(s.sessionId) ?? s.createdAt.slice(0, 10);
    const est = estimate1RM(s.weightKg, s.reps);
    const key = `${s.sessionId}:${s.exerciseId}`;
    const existing = bestBySessionExercise.get(key);
    if (!existing || est > existing.est) {
      bestBySessionExercise.set(key, { date, exerciseId: s.exerciseId, exerciseName: s.exerciseName, est });
    }
  }

  const bestsByExercise = new Map<number, SessionExerciseBest[]>();
  for (const best of bestBySessionExercise.values()) {
    if (!bestsByExercise.has(best.exerciseId)) bestsByExercise.set(best.exerciseId, []);
    bestsByExercise.get(best.exerciseId)!.push(best);
  }

  const events: RankEvent[] = [];
  for (const sessionBests of bestsByExercise.values()) {
    const sorted = [...sessionBests].sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? -1 : 1));
    let allTimeBest = 0;
    for (const sb of sorted) {
      if (allTimeBest === 0) {
        allTimeBest = sb.est;
        continue;
      }
      if (sb.est > allTimeBest) {
        if (sb.date >= rangeStart && sb.date <= rangeEnd) {
          const points = Math.min(40, 10 + Math.round(((sb.est - allTimeBest) / allTimeBest) * 100));
          events.push({ date: sb.date, label: `Record battu · ${sb.exerciseName}`, points, source: 'pr' });
        }
        allTimeBest = sb.est;
      }
    }
  }
  return events;
}

function computeNutritionEvents(
  nutritionEntries: NutritionEntry[],
  bodyWeightEntries: BodyWeightEntry[],
  goal: NutritionGoal,
  rangeStart: string,
  rangeEnd: string
): RankEvent[] {
  const currentWeight = latestBodyWeight(bodyWeightEntries);
  if (!currentWeight) return [];
  const targets = macroTargets(currentWeight, goal);
  const today = todayKey();

  const caloriesByDate = new Map<string, number>();
  for (const e of nutritionEntries) {
    if (e.date < rangeStart || e.date > rangeEnd || e.date >= today) continue; // journée du jour pas encore terminée
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

const SHRINK_IS_PROGRESS: MeasurementType[] = ['waist', 'hips'];

/** For waist/hips, smaller is progress unless the goal is a bulk (where it's not meaningfully scored). */
function isMeasurementImprovement(type: MeasurementType, prevCm: number, newCm: number, goal: NutritionGoal): boolean {
  if (SHRINK_IS_PROGRESS.includes(type)) return goal !== 'bulk' && newCm < prevCm;
  return newCm > prevCm;
}

function computeMeasurementEvents(
  measurementEntries: MeasurementEntry[],
  goal: NutritionGoal,
  rangeStart: string,
  rangeEnd: string
): RankEvent[] {
  const events: RankEvent[] = [];

  const loggedDates = new Set(
    measurementEntries.filter((e) => e.date >= rangeStart && e.date <= rangeEnd).map((e) => e.date)
  );
  for (const date of loggedDates) {
    events.push({ date, label: 'Mensuration loggée', points: 3, source: 'measurement' });
  }

  const byType = new Map<MeasurementType, MeasurementEntry[]>();
  for (const e of measurementEntries) {
    if (!byType.has(e.type)) byType.set(e.type, []);
    byType.get(e.type)!.push(e);
  }
  for (const [type, entries] of byType) {
    const sorted = [...entries].sort((a, b) => (a.date === b.date ? a.id - b.id : a.date < b.date ? -1 : 1));
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      if (curr.date < rangeStart || curr.date > rangeEnd) continue;
      if (isMeasurementImprovement(type, prev.valueCm, curr.valueCm, goal)) {
        events.push({
          date: curr.date,
          label: `Progression · ${MEASUREMENT_TYPE_LABELS[type]}`,
          points: 8,
          source: 'measurement',
        });
      }
    }
  }

  return events;
}

export interface RankingParams {
  sessions: WorkoutSession[];
  sets: SetWithExercise[];
  nutritionEntries: NutritionEntry[];
  bodyWeightEntries: BodyWeightEntry[];
  measurementEntries: MeasurementEntry[];
  measurementsEnabled: boolean;
  trainingDays: number[];
  goal: NutritionGoal;
  accountCreatedAt: string;
}

function computeEventsForRange(params: RankingParams, rangeStart: string, rangeEnd: string): RankEvent[] {
  const streakEvents = computeStreakEvents(
    params.sessions,
    params.trainingDays,
    params.accountCreatedAt,
    rangeStart,
    rangeEnd
  );
  const prEvents = computePRPoints(params.sets, params.sessions, rangeStart, rangeEnd);
  const nutritionEvents = computeNutritionEvents(
    params.nutritionEntries,
    params.bodyWeightEntries,
    params.goal,
    rangeStart,
    rangeEnd
  );
  const measurementEvents = params.measurementsEnabled
    ? computeMeasurementEvents(params.measurementEntries, params.goal, rangeStart, rangeEnd)
    : [];
  return [...streakEvents, ...prEvents, ...nutritionEvents, ...measurementEvents];
}

export interface SeasonRanking {
  seasonInfo: SeasonInfo;
  totalPoints: number;
  state: RankState;
  events: RankEvent[];
  breakdown: { streak: number; pr: number; nutrition: number; measurement: number };
}

/**
 * Note: the server (server/src/utils/ranking.js) also awards a bonus for sitting above the
 * community's average best 1RM on a shared exercise. That needs every user's data to compute
 * an average, which never gets synced to a single device — so it can't be reproduced here.
 * This means the locally-estimated total can undershoot the authoritative server value by a
 * few points; that's expected, not a bug, and resolves itself after the next /leaderboard/report.
 */
export function computeSeasonRanking(
  params: RankingParams,
  seasonInfo: SeasonInfo = currentSeasonInfo()
): SeasonRanking {
  const today = todayKey();
  const effectiveEnd = seasonInfo.endDate < today ? seasonInfo.endDate : today;

  const streakEvents = computeStreakEvents(
    params.sessions,
    params.trainingDays,
    params.accountCreatedAt,
    seasonInfo.startDate,
    effectiveEnd
  );
  const prEvents = computePRPoints(params.sets, params.sessions, seasonInfo.startDate, effectiveEnd);
  const nutritionEvents = computeNutritionEvents(
    params.nutritionEntries,
    params.bodyWeightEntries,
    params.goal,
    seasonInfo.startDate,
    effectiveEnd
  );
  const measurementEvents = params.measurementsEnabled
    ? computeMeasurementEvents(params.measurementEntries, params.goal, seasonInfo.startDate, effectiveEnd)
    : [];

  const events = [...streakEvents, ...prEvents, ...nutritionEvents, ...measurementEvents].sort((a, b) =>
    a.date === b.date ? 0 : a.date < b.date ? 1 : -1
  );
  const totalPoints = events.reduce((sum, e) => sum + e.points, 0);

  return {
    seasonInfo,
    totalPoints,
    state: tierFromPoints(totalPoints),
    events,
    breakdown: {
      streak: streakEvents.reduce((s, e) => s + e.points, 0),
      pr: prEvents.reduce((s, e) => s + e.points, 0),
      nutrition: nutritionEvents.reduce((s, e) => s + e.points, 0),
      measurement: measurementEvents.reduce((s, e) => s + e.points, 0),
    },
  };
}

export interface SeasonMedal {
  seasonInfo: SeasonInfo;
  isComplete: boolean;
  /** One entry per calendar month of the season; null = that month hasn't happened yet. */
  segments: (RankName | null)[];
  peakRank: RankName;
}

export function computeSeasonMedal(params: RankingParams, seasonInfo: SeasonInfo): SeasonMedal {
  const today = todayKey();
  const effectiveEnd = seasonInfo.endDate < today ? seasonInfo.endDate : today;

  const events = computeEventsForRange(params, seasonInfo.startDate, effectiveEnd);
  const pointsByDate = new Map<string, number>();
  for (const e of events) {
    pointsByDate.set(e.date, (pointsByDate.get(e.date) ?? 0) + e.points);
  }

  const start = new Date(`${seasonInfo.startDate}T00:00:00`);
  const monthStarts: string[] = [];
  const monthEnds: string[] = [];
  for (let i = 0; i < 6; i++) {
    monthStarts.push(toDateKey(new Date(start.getFullYear(), start.getMonth() + i, 1)));
    monthEnds.push(toDateKey(new Date(start.getFullYear(), start.getMonth() + i + 1, 0)));
  }

  // A month's bar lights up as soon as that month has started, using whatever peak has
  // been reached so far — not only once the whole month is over — so live progress shows
  // up on the medal immediately instead of a month late.
  const segments: (RankName | null)[] = [];
  let cumulative = 0;
  let runningMax = 0;
  let cursor = start;
  let cursorKey = toDateKey(cursor);
  for (let i = 0; i < 6; i++) {
    if (monthStarts[i] > effectiveEnd) {
      segments.push(null);
      continue;
    }
    const target = monthEnds[i] < effectiveEnd ? monthEnds[i] : effectiveEnd;
    while (cursorKey <= target) {
      cumulative += pointsByDate.get(cursorKey) ?? 0;
      runningMax = Math.max(runningMax, cumulative);
      cursor = addDays(cursor, 1);
      cursorKey = toDateKey(cursor);
    }
    segments.push(tierFromPoints(runningMax).rank);
  }

  return {
    seasonInfo,
    isComplete: seasonInfo.endDate < today,
    segments,
    peakRank: tierFromPoints(runningMax).rank,
  };
}

/** All season medals from Season 1 through the current season, most recent first. */
export function computeSeasonMedalHistory(params: RankingParams): SeasonMedal[] {
  const current = currentSeasonInfo();
  const medals: SeasonMedal[] = [];
  for (let n = current.seasonNumber; n >= 1; n--) {
    const info = n === current.seasonNumber ? current : seasonInfoForNumber(n);
    medals.push(computeSeasonMedal(params, info));
  }
  return medals;
}
