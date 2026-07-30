import { Ionicons } from '@expo/vector-icons';
import { BodyWeightEntry, NutritionEntry, NutritionGoal, SetWithExercise, WorkoutSession } from '../types';
import { addDays, toDateKey, todayKey } from './date';
import { isTrainingDay } from './program';
import { estimate1RM } from './oneRepMax';
import { macroTargets } from './nutrition';
import { latestBodyWeight } from './nutritionStats';
import { computeSeasonRanking, RANKS, type RankingParams } from './ranking';

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}

export const BADGES: Badge[] = [
  { id: 'first-session', name: 'Premier coup de marteau', description: 'Logge ta première séance.', icon: 'hammer' },
  { id: 'bar-100', name: 'Barre à 100', description: 'Logge une série à 100 kg ou plus.', icon: 'barbell' },
  {
    id: 'streak-7',
    name: 'Chauffé à blanc',
    description: '7 jours d’entraînement prévus d’affilée, sans en manquer un.',
    icon: 'flame',
  },
  { id: 'sessions-20', name: '20 séances forgées', description: 'Logge 20 séances au total.', icon: 'layers' },
  { id: 'prs-10', name: '10 records brisés', description: 'Bats 10 records personnels au total.', icon: 'trophy' },
  {
    id: 'nutrition-14',
    name: 'Discipline de fer',
    description: 'Atteins ton objectif calorique 14 jours au total.',
    icon: 'nutrition',
  },
  {
    id: 'bodyweight-10',
    name: 'Suivi assidu',
    description: 'Logge ton poids de corps 10 jours différents.',
    icon: 'analytics',
  },
  {
    id: 'rank-acier',
    name: 'Rang Acier',
    description: 'Atteins le rang Acier ou plus sur la saison en cours.',
    icon: 'shield',
  },
];

function countAllTimePRs(sets: SetWithExercise[], sessions: WorkoutSession[]): number {
  const dateBySession = new Map(sessions.map((s) => [s.id, s.date]));
  const sorted = [...sets].sort((a, b) => {
    const da = dateBySession.get(a.sessionId) ?? a.createdAt.slice(0, 10);
    const db = dateBySession.get(b.sessionId) ?? b.createdAt.slice(0, 10);
    if (da !== db) return da < db ? -1 : 1;
    return a.id - b.id;
  });
  const bestByExercise = new Map<number, number>();
  let count = 0;
  for (const s of sorted) {
    const est = estimate1RM(s.weightKg, s.reps);
    const prevBest = bestByExercise.get(s.exerciseId) ?? 0;
    if (est > prevBest) {
      count += 1;
      bestByExercise.set(s.exerciseId, est);
    }
  }
  return count;
}

function countMaxTrainingStreak(sessions: WorkoutSession[], trainingDays: number[]): number {
  if (trainingDays.length === 0 || sessions.length === 0) return 0;
  const loggedDates = new Set(sessions.map((s) => s.date));
  const firstDate = [...sessions].map((s) => s.date).sort()[0];
  const today = todayKey();

  let cursor = new Date(`${firstDate}T00:00:00`);
  let cursorKey = toDateKey(cursor);
  let current = 0;
  let max = 0;
  while (cursorKey <= today) {
    if (isTrainingDay(cursor, trainingDays)) {
      if (loggedDates.has(cursorKey)) {
        current += 1;
        max = Math.max(max, current);
      } else if (cursorKey < today) {
        current = 0;
      }
    }
    cursor = addDays(cursor, 1);
    cursorKey = toDateKey(cursor);
  }
  return max;
}

function countNutritionTargetDaysHit(
  nutritionEntries: NutritionEntry[],
  bodyWeightEntries: BodyWeightEntry[],
  goal: NutritionGoal
): number {
  const currentWeight = latestBodyWeight(bodyWeightEntries);
  if (!currentWeight) return 0;
  const targets = macroTargets(currentWeight, goal);
  const today = todayKey();

  const caloriesByDate = new Map<string, number>();
  for (const e of nutritionEntries) {
    if (e.date >= today) continue;
    const calories = e.proteinG * 4 + e.carbsG * 4 + e.fatG * 9;
    caloriesByDate.set(e.date, (caloriesByDate.get(e.date) ?? 0) + calories);
  }
  let count = 0;
  for (const calories of caloriesByDate.values()) {
    const ratio = calories / targets.calories;
    if (ratio >= 0.85 && ratio <= 1.15) count += 1;
  }
  return count;
}

export interface BadgeStatus {
  badge: Badge;
  unlocked: boolean;
  progress: string;
}

export function computeBadgeStatuses(params: RankingParams): BadgeStatus[] {
  const maxWeight = params.sets.reduce((max, s) => Math.max(max, s.weightKg), 0);
  const streak = countMaxTrainingStreak(params.sessions, params.trainingDays);
  const prCount = countAllTimePRs(params.sets, params.sessions);
  const nutritionDays = countNutritionTargetDaysHit(params.nutritionEntries, params.bodyWeightEntries, params.goal);
  const bodyWeightDays = new Set(params.bodyWeightEntries.map((e) => e.date)).size;
  const seasonRank = computeSeasonRanking(params).state.rank;
  const rankIndex = RANKS.indexOf(seasonRank);

  const values: Record<string, { unlocked: boolean; progress: string }> = {
    'first-session': { unlocked: params.sessions.length >= 1, progress: `${Math.min(params.sessions.length, 1)}/1` },
    'bar-100': { unlocked: maxWeight >= 100, progress: `${Math.min(maxWeight, 100).toFixed(0)}/100 kg` },
    'streak-7': { unlocked: streak >= 7, progress: `${Math.min(streak, 7)}/7 jours` },
    'sessions-20': { unlocked: params.sessions.length >= 20, progress: `${Math.min(params.sessions.length, 20)}/20` },
    'prs-10': { unlocked: prCount >= 10, progress: `${Math.min(prCount, 10)}/10` },
    'nutrition-14': { unlocked: nutritionDays >= 14, progress: `${Math.min(nutritionDays, 14)}/14 jours` },
    'bodyweight-10': { unlocked: bodyWeightDays >= 10, progress: `${Math.min(bodyWeightDays, 10)}/10 jours` },
    'rank-acier': {
      unlocked: rankIndex >= 2,
      progress: rankIndex >= 2 ? 'Débloqué' : `Rang actuel : ${seasonRank}`,
    },
  };

  return BADGES.map((badge) => ({
    badge,
    unlocked: values[badge.id].unlocked,
    progress: values[badge.id].progress,
  }));
}
