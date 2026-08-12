import { Ionicons } from '@expo/vector-icons';
import { BodyWeightEntry, Exercise, NutritionEntry, NutritionGoal, SetWithExercise, WorkoutSession } from '../types';
import { addDays, toDateKey, todayKey } from './date';
import { isTrainingDay } from './program';
import { estimate1RM } from './oneRepMax';
import { macroTargets } from './nutrition';
import { latestBodyWeight } from './nutritionStats';
import {
  computeSeasonRanking,
  DIVISIONS,
  POINTS_PER_DIVISION,
  RANKS,
  TOTAL_TIERS,
  type RankingParams,
} from './ranking';

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
  { id: 'bar-140', name: 'Barre à 140', description: 'Logge une série à 140 kg ou plus.', icon: 'barbell' },
  { id: 'bar-180', name: 'Barre à 180', description: 'Logge une série à 180 kg ou plus.', icon: 'barbell' },
  { id: 'sessions-50', name: '50 séances forgées', description: 'Logge 50 séances au total.', icon: 'layers' },
  { id: 'sessions-100', name: '100 séances forgées', description: 'Logge 100 séances au total.', icon: 'layers' },
  {
    id: 'streak-14',
    name: 'Fer trempé',
    description: '14 jours d’entraînement prévus d’affilée, sans en manquer un.',
    icon: 'flame',
  },
  {
    id: 'streak-30',
    name: 'Acier inoxydable',
    description: '30 jours d’entraînement prévus d’affilée, sans en manquer un.',
    icon: 'flame',
  },
  { id: 'prs-25', name: '25 records brisés', description: 'Bats 25 records personnels au total.', icon: 'trophy' },
  { id: 'prs-50', name: '50 records brisés', description: 'Bats 50 records personnels au total.', icon: 'trophy' },
  {
    id: 'nutrition-30',
    name: 'Discipline d’acier',
    description: 'Atteins ton objectif calorique 30 jours au total.',
    icon: 'nutrition',
  },
  {
    id: 'nutrition-60',
    name: 'Discipline de légende',
    description: 'Atteins ton objectif calorique 60 jours au total.',
    icon: 'nutrition',
  },
  {
    id: 'bodyweight-30',
    name: 'Suivi rigoureux',
    description: 'Logge ton poids de corps 30 jours différents.',
    icon: 'analytics',
  },
  {
    id: 'bodyweight-60',
    name: 'Suivi implacable',
    description: 'Logge ton poids de corps 60 jours différents.',
    icon: 'analytics',
  },
  {
    id: 'rank-argent',
    name: 'Rang Argent',
    description: 'Atteins le rang Argent ou plus sur la saison en cours.',
    icon: 'shield',
  },
  { id: 'rank-or', name: 'Rang Or', description: 'Atteins le rang Or ou plus sur la saison en cours.', icon: 'shield' },
  {
    id: 'rank-amethyste',
    name: 'Rang Améthyste',
    description: 'Atteins le rang Améthyste ou plus sur la saison en cours.',
    icon: 'shield',
  },
  {
    id: 'rank-emeraude',
    name: 'Rang Émeraude',
    description: 'Atteins le rang Émeraude ou plus sur la saison en cours.',
    icon: 'shield',
  },
  {
    id: 'rank-rubis',
    name: 'Rang Rubis',
    description: 'Atteins le rang Rubis ou plus sur la saison en cours.',
    icon: 'shield',
  },
  {
    id: 'rank-saphir',
    name: 'Rang Saphir',
    description: 'Atteins le rang Saphir ou plus sur la saison en cours.',
    icon: 'shield',
  },
  {
    id: 'rank-diamant',
    name: 'Rang Diamant',
    description: 'Atteins le rang Diamant ou plus sur la saison en cours.',
    icon: 'shield',
  },
  {
    id: 'rank-legende',
    name: 'Rang Légende',
    description: 'Atteins le rang Légende ou plus sur la saison en cours.',
    icon: 'shield',
  },
  {
    id: 'rank-divin',
    name: 'Rang Divin',
    description: 'Atteins le rang Divin sur la saison en cours.',
    icon: 'shield',
  },
  { id: 'measurement-5', name: 'Métrologue', description: 'Logge une mensuration 5 jours différents.', icon: 'body' },
  {
    id: 'exercises-variety-10',
    name: 'Boîte à outils',
    description: 'Logge au moins 10 exercices différents.',
    icon: 'grid',
  },
  {
    id: 'exercises-variety-25',
    name: 'Arsenal complet',
    description: 'Logge au moins 25 exercices différents.',
    icon: 'grid',
  },
  {
    id: 'custom-exercise-1',
    name: 'Forgeron d’exercices',
    description: 'Crée ton premier exercice personnalisé.',
    icon: 'construct',
  },
  {
    id: 'volume-50k',
    name: '50 tonnes soulevées',
    description: 'Cumule 50 000 kg soulevés au total, toutes séances confondues.',
    icon: 'trending-up',
  },
  {
    id: 'volume-250k',
    name: '250 tonnes soulevées',
    description: 'Cumule 250 000 kg soulevés au total, toutes séances confondues.',
    icon: 'trending-up',
  },
  { id: 'sets-100', name: '100 coups de forge', description: 'Logge 100 séries au total.', icon: 'checkmark-done' },
  { id: 'sets-500', name: '500 coups de forge', description: 'Logge 500 séries au total.', icon: 'checkmark-done' },
  {
    id: 'estimated-1rm-150',
    name: 'Force brute',
    description: 'Atteins une 1RM estimée de 150 kg ou plus sur un exercice.',
    icon: 'flash',
  },
];

// One badge per rank+division tier (Fer IV, Fer III, ... Divin I), not just per rank — generated
// from RANKS/DIVISIONS instead of hand-listed so it can't drift out of sync with the ladder (see
// utils/ranking.ts). Tier 0 (Fer IV) is skipped: everyone starts there, so it isn't an achievement.
export interface TierInfo {
  tierIndex: number;
  id: string;
  name: string;
  threshold: number;
}

export const TIER_LIST: TierInfo[] = [];
for (let tierIndex = 1; tierIndex < TOTAL_TIERS; tierIndex++) {
  const rank = RANKS[Math.floor(tierIndex / DIVISIONS.length)];
  const division = DIVISIONS[tierIndex % DIVISIONS.length];
  TIER_LIST.push({
    tierIndex,
    id: `tier-${tierIndex}`,
    name: `${rank} ${division}`,
    threshold: tierIndex * POINTS_PER_DIVISION,
  });
}

const TIER_BADGES: Badge[] = TIER_LIST.map((tier) => ({
  id: tier.id,
  name: tier.name,
  description: `Atteins le palier ${tier.name}.`,
  icon: 'ribbon',
}));

BADGES.push(...TIER_BADGES);

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

export type BadgeProgress =
  | { kind: 'plain' | 'kg' | 'days'; current: number; target: number }
  | { kind: 'rank'; unlocked: boolean; rank: string };

export interface BadgeStatus {
  badge: Badge;
  unlocked: boolean;
  progress: BadgeProgress;
}

export interface BadgeParams extends RankingParams {
  exercises: Exercise[];
}

function tierEntry(current: number, target: number, kind: 'plain' | 'kg' | 'days' = 'plain'): {
  unlocked: boolean;
  progress: BadgeProgress;
} {
  return { unlocked: current >= target, progress: { kind, current: Math.min(current, target), target } };
}

export function computeBadgeStatuses(params: BadgeParams): BadgeStatus[] {
  const maxWeight = params.sets.reduce((max, s) => Math.max(max, s.weightKg), 0);
  const streak = countMaxTrainingStreak(params.sessions, params.trainingDays);
  const prCount = countAllTimePRs(params.sets, params.sessions);
  const nutritionDays = countNutritionTargetDaysHit(params.nutritionEntries, params.bodyWeightEntries, params.goal);
  const bodyWeightDays = new Set(params.bodyWeightEntries.map((e) => e.date)).size;
  const seasonRanking = computeSeasonRanking(params);
  const seasonRank = seasonRanking.state.rank;
  const rankIndex = RANKS.indexOf(seasonRank);
  const totalPoints = seasonRanking.totalPoints;
  const measurementDays = new Set(params.measurementEntries.map((e) => e.date)).size;
  const distinctExercises = new Set(params.sets.map((s) => s.exerciseId)).size;
  const hasCustomExercise = params.exercises.some((e) => e.isCustom);
  const totalVolume = params.sets.reduce((sum, s) => sum + s.weightKg * s.reps, 0);
  const totalSets = params.sets.length;
  const maxEst1RM = params.sets.reduce((max, s) => Math.max(max, estimate1RM(s.weightKg, s.reps)), 0);

  // Looked up by rank name rather than a hardcoded index, so inserting new ranks into the
  // ladder (utils/ranking.ts) can never silently shift which rank an existing badge requires.
  const rankEntry = (minRank: (typeof RANKS)[number]) => {
    const minIndex = RANKS.indexOf(minRank);
    return {
      unlocked: rankIndex >= minIndex,
      progress: { kind: 'rank' as const, unlocked: rankIndex >= minIndex, rank: seasonRank },
    };
  };

  const values: Record<string, { unlocked: boolean; progress: BadgeProgress }> = {
    'first-session': tierEntry(params.sessions.length, 1),
    'bar-100': tierEntry(maxWeight, 100, 'kg'),
    'streak-7': tierEntry(streak, 7, 'days'),
    'sessions-20': tierEntry(params.sessions.length, 20),
    'prs-10': tierEntry(prCount, 10),
    'nutrition-14': tierEntry(nutritionDays, 14, 'days'),
    'bodyweight-10': tierEntry(bodyWeightDays, 10, 'days'),
    'rank-acier': rankEntry('Acier'),
    'bar-140': tierEntry(maxWeight, 140, 'kg'),
    'bar-180': tierEntry(maxWeight, 180, 'kg'),
    'sessions-50': tierEntry(params.sessions.length, 50),
    'sessions-100': tierEntry(params.sessions.length, 100),
    'streak-14': tierEntry(streak, 14, 'days'),
    'streak-30': tierEntry(streak, 30, 'days'),
    'prs-25': tierEntry(prCount, 25),
    'prs-50': tierEntry(prCount, 50),
    'nutrition-30': tierEntry(nutritionDays, 30, 'days'),
    'nutrition-60': tierEntry(nutritionDays, 60, 'days'),
    'bodyweight-30': tierEntry(bodyWeightDays, 30, 'days'),
    'bodyweight-60': tierEntry(bodyWeightDays, 60, 'days'),
    'rank-argent': rankEntry('Argent'),
    'rank-or': rankEntry('Or'),
    'rank-amethyste': rankEntry('Améthyste'),
    'rank-emeraude': rankEntry('Émeraude'),
    'rank-rubis': rankEntry('Rubis'),
    'rank-saphir': rankEntry('Saphir'),
    'rank-diamant': rankEntry('Diamant'),
    'rank-legende': rankEntry('Légende'),
    'rank-divin': rankEntry('Divin'),
    'measurement-5': tierEntry(measurementDays, 5, 'days'),
    'exercises-variety-10': tierEntry(distinctExercises, 10),
    'exercises-variety-25': tierEntry(distinctExercises, 25),
    'custom-exercise-1': tierEntry(hasCustomExercise ? 1 : 0, 1),
    'volume-50k': tierEntry(Math.round(totalVolume), 50000, 'kg'),
    'volume-250k': tierEntry(Math.round(totalVolume), 250000, 'kg'),
    'sets-100': tierEntry(totalSets, 100),
    'sets-500': tierEntry(totalSets, 500),
    'estimated-1rm-150': tierEntry(Math.round(maxEst1RM), 150, 'kg'),
  };

  for (const tier of TIER_LIST) {
    values[tier.id] = tierEntry(totalPoints, tier.threshold);
  }

  return BADGES.map((badge) => ({
    badge,
    unlocked: values[badge.id].unlocked,
    progress: values[badge.id].progress,
  }));
}
