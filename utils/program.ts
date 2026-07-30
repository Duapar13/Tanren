import { SessionCategory, SplitType } from '../types';
import { startOfWeek } from './date';

export type SplitDayType = SessionCategory | 'rest';

export const SPLIT_STAGES: Record<SplitType, SessionCategory[]> = {
  upper_lower: ['upper', 'lower'],
  ppl: ['push', 'pull', 'legs'],
};

export const SPLIT_DAY_LABELS: Record<SplitDayType, string> = {
  upper: 'Haut du corps',
  lower: 'Bas du corps',
  push: 'Push',
  pull: 'Pull',
  legs: 'Legs',
  custom: 'Perso',
  rest: 'Repos',
};

// Broad exercise-library filter for PPL sessions, since the exercise catalog is only tagged upper/lower.
export const PPL_EXERCISE_FILTER: Record<'push' | 'pull' | 'legs', 'upper' | 'lower'> = {
  push: 'upper',
  pull: 'upper',
  legs: 'lower',
};

const DEFAULT_TRAINING_DAYS = [1, 2, 3, 4, 5]; // lundi-vendredi, même comportement que l'ancien split fixe
const DEFAULT_SPLIT_TYPE: SplitType = 'upper_lower';

// Lundi=0..Dimanche=6, pour ordonner les jours dans la semaine (aligné sur startOfWeek qui commence un lundi).
function weekOrder(dayOfWeek: number): number {
  return (dayOfWeek + 6) % 7;
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const EPOCH_MONDAY = startOfWeek(new Date(2020, 0, 1));

/** Combien de fois un jour d'entraînement est tombé entre une référence stable et `date` (inclus). */
function trainingDayOccurrenceIndex(trainingDays: number[], date: Date): number {
  if (trainingDays.length === 0) return 0;
  const sorted = [...trainingDays].sort((a, b) => weekOrder(a) - weekOrder(b));
  const dateMonday = startOfWeek(date);
  const fullWeeks = Math.round((dateMonday.getTime() - EPOCH_MONDAY.getTime()) / WEEK_MS);
  const occurrencesBeforeThisWeek = fullWeeks * sorted.length;
  const occurrencesThisWeekUpToToday = sorted.filter((d) => weekOrder(d) <= weekOrder(date.getDay())).length;
  return occurrencesBeforeThisWeek + occurrencesThisWeekUpToToday; // 1-based si `date` est un jour d'entraînement
}

export function getSessionTypeForDate(
  date: Date,
  trainingDays: number[] = DEFAULT_TRAINING_DAYS,
  splitType: SplitType = DEFAULT_SPLIT_TYPE
): SplitDayType {
  const days = trainingDays.length > 0 ? trainingDays : DEFAULT_TRAINING_DAYS;
  if (!days.includes(date.getDay())) return 'rest';
  const stages = SPLIT_STAGES[splitType];
  const occurrenceIndex = trainingDayOccurrenceIndex(days, date) - 1;
  return stages[occurrenceIndex % stages.length];
}
