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
  source: 'streak' | 'pr' | 'nutrition';
}

function computeStreakEvents(
  sessions: WorkoutSession[],
  trainingDays: number[],
  splitType: SplitType,
  rangeStart: string,
  rangeEnd: string
): RankEvent[] {
  if (trainingDays.length === 0) return [];
  const loggedDates = new Set(sessions.map((s) => s.date));
  const events: RankEvent[] = [];
  let cursor = new Date(`${rangeStart}T00:00:00`);
  let cursorKey = toDateKey(cursor);
  const today = todayKey();
  while (cursorKey <= rangeEnd) {
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
  rangeStart: string,
  rangeEnd: string
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
      if (date >= rangeStart && date <= rangeEnd) {
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

export interface RankingParams {
  sessions: WorkoutSession[];
  sets: SetWithExercise[];
  nutritionEntries: NutritionEntry[];
  bodyWeightEntries: BodyWeightEntry[];
  trainingDays: number[];
  splitType: SplitType;
  goal: NutritionGoal;
}

function computeEventsForRange(params: RankingParams, rangeStart: string, rangeEnd: string): RankEvent[] {
  const streakEvents = computeStreakEvents(params.sessions, params.trainingDays, params.splitType, rangeStart, rangeEnd);
  const prEvents = computePRPoints(params.sets, params.sessions, rangeStart, rangeEnd);
  const nutritionEvents = computeNutritionEvents(
    params.nutritionEntries,
    params.bodyWeightEntries,
    params.goal,
    rangeStart,
    rangeEnd
  );
  return [...streakEvents, ...prEvents, ...nutritionEvents];
}

export interface SeasonRanking {
  seasonInfo: SeasonInfo;
  totalPoints: number;
  state: RankState;
  events: RankEvent[];
  breakdown: { streak: number; pr: number; nutrition: number };
}

/** devBonusPoints: dev-mode-only local preview offset, never synced or persisted server-side. */
export function computeSeasonRanking(
  params: RankingParams,
  seasonInfo: SeasonInfo = currentSeasonInfo(),
  devBonusPoints = 0
): SeasonRanking {
  const today = todayKey();
  const effectiveEnd = seasonInfo.endDate < today ? seasonInfo.endDate : today;

  const streakEvents = computeStreakEvents(params.sessions, params.trainingDays, params.splitType, seasonInfo.startDate, effectiveEnd);
  const prEvents = computePRPoints(params.sets, params.sessions, seasonInfo.startDate, effectiveEnd);
  const nutritionEvents = computeNutritionEvents(
    params.nutritionEntries,
    params.bodyWeightEntries,
    params.goal,
    seasonInfo.startDate,
    effectiveEnd
  );

  const events = [...streakEvents, ...prEvents, ...nutritionEvents].sort((a, b) =>
    a.date === b.date ? 0 : a.date < b.date ? 1 : -1
  );
  const totalPoints = events.reduce((sum, e) => sum + e.points, 0) + devBonusPoints;

  return {
    seasonInfo,
    totalPoints,
    state: tierFromPoints(totalPoints),
    events,
    breakdown: {
      streak: streakEvents.reduce((s, e) => s + e.points, 0),
      pr: prEvents.reduce((s, e) => s + e.points, 0),
      nutrition: nutritionEvents.reduce((s, e) => s + e.points, 0) + devBonusPoints,
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

export function computeSeasonMedal(
  params: RankingParams,
  seasonInfo: SeasonInfo,
  devBonusPoints = 0
): SeasonMedal {
  const today = todayKey();
  const effectiveEnd = seasonInfo.endDate < today ? seasonInfo.endDate : today;

  const events = computeEventsForRange(params, seasonInfo.startDate, effectiveEnd);
  const pointsByDate = new Map<string, number>();
  for (const e of events) {
    pointsByDate.set(e.date, (pointsByDate.get(e.date) ?? 0) + e.points);
  }
  // Attribute the dev preview bonus on day one so it factors into every month's running peak.
  if (devBonusPoints) {
    pointsByDate.set(seasonInfo.startDate, (pointsByDate.get(seasonInfo.startDate) ?? 0) + devBonusPoints);
  }

  const start = new Date(`${seasonInfo.startDate}T00:00:00`);
  const monthStarts: string[] = [];
  const monthEnds: string[] = [];
  for (let i = 0; i < 6; i++) {
    monthStarts.push(toDateKey(new Date(start.getFullYear(), start.getMonth() + i, 1)));
    monthEnds.push(toDateKey(new Date(start.getFullYear(), start.getMonth() + i + 1, 0)));
  }

  // A month's bar lights up as soon as that month has started, using whatever peak has
  // been reached so far — not only once the whole month is over — so live progress (and
  // dev-mode bonus points) show up on the medal immediately instead of a month late.
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
export function computeSeasonMedalHistory(params: RankingParams, devBonusPoints = 0): SeasonMedal[] {
  const current = currentSeasonInfo();
  const medals: SeasonMedal[] = [];
  for (let n = current.seasonNumber; n >= 1; n--) {
    const info = n === current.seasonNumber ? current : seasonInfoForNumber(n);
    medals.push(computeSeasonMedal(params, info, n === current.seasonNumber ? devBonusPoints : 0));
  }
  return medals;
}
