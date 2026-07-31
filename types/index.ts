export type SessionCategory = 'upper' | 'lower' | 'custom' | 'push' | 'pull' | 'legs';

export const MUSCLE_GROUPS = [
  'pecs',
  'dos',
  'epaules',
  'bras',
  'quadriceps',
  'ischios',
  'fessiers',
  'mollets',
] as const;

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

export const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  pecs: 'Pecs',
  dos: 'Dos',
  epaules: 'Épaules',
  bras: 'Bras',
  quadriceps: 'Quadriceps',
  ischios: 'Ischios',
  fessiers: 'Fessiers',
  mollets: 'Mollets',
};

export const MUSCLE_GROUP_CATEGORY: Record<MuscleGroup, 'upper' | 'lower'> = {
  pecs: 'upper',
  dos: 'upper',
  epaules: 'upper',
  bras: 'upper',
  quadriceps: 'lower',
  ischios: 'lower',
  fessiers: 'lower',
  mollets: 'lower',
};

export interface Exercise {
  id: number;
  name: string;
  category: 'upper' | 'lower';
  muscleGroup: MuscleGroup;
  isCustom: boolean;
  createdAt: string;
}

export type ExerciseInput = Omit<Exercise, 'id' | 'createdAt'>;

export interface WorkoutSession {
  id: number;
  date: string; // ISO date (yyyy-mm-dd)
  category: SessionCategory;
  notes: string;
  createdAt: string;
}

export type WorkoutSessionInput = Omit<WorkoutSession, 'id' | 'createdAt'>;

export interface SetEntry {
  id: number;
  sessionId: number;
  exerciseId: number;
  setNumber: number;
  reps: number;
  weightKg: number;
  rpe: number | null;
  createdAt: string;
}

export type SetEntryInput = Omit<SetEntry, 'id' | 'createdAt'>;

export interface SetWithExercise extends SetEntry {
  exerciseName: string;
  exerciseCategory: 'upper' | 'lower';
  exerciseMuscleGroup: MuscleGroup;
}

export interface BodyWeightEntry {
  id: number;
  date: string;
  weightKg: number;
  createdAt: string;
}

export type BodyWeightEntryInput = Omit<BodyWeightEntry, 'id' | 'createdAt'>;

export const MEASUREMENT_TYPES = [
  'biceps',
  'waist',
  'chest',
  'thighs',
  'neck',
  'forearms',
  'calves',
  'hips',
] as const;
export type MeasurementType = (typeof MEASUREMENT_TYPES)[number];

export const MEASUREMENT_TYPE_LABELS: Record<MeasurementType, string> = {
  biceps: 'Bras',
  waist: 'Taille',
  chest: 'Torse',
  thighs: 'Cuisses',
  neck: 'Cou',
  forearms: 'Avant-bras',
  calves: 'Mollets',
  hips: 'Hanches',
};

export interface MeasurementEntry {
  id: number;
  date: string;
  type: MeasurementType;
  valueCm: number;
  createdAt: string;
}

export type MeasurementEntryInput = Omit<MeasurementEntry, 'id' | 'createdAt'>;

export interface NutritionEntry {
  id: number;
  date: string;
  proteinG: number;
  carbsG: number;
  fatG: number;
  foodName: string | null;
  grams: number | null;
  unit: 'g' | 'ml' | null;
  barcode: string | null;
  createdAt: string;
}

export type NutritionEntryInput = Omit<NutritionEntry, 'id' | 'createdAt'>;

export type NutritionGoal = 'bulk' | 'cut' | 'maintain';

export interface User {
  id: number;
  email: string;
  username: string;
  displayName: string | null;
  heightCm: number | null;
  goal: NutritionGoal;
  restTimerEnabled: boolean;
  restTimerSeconds: number;
  trainingDays: number[]; // 0=dimanche..6=samedi (convention JS Date.getDay())
  rpeEnabled: boolean;
  measurementsEnabled: boolean;
  createdAt: string;
  customProteinG: number | null;
  customCarbsG: number | null;
  customFatG: number | null;
  onboardingCompleted: boolean;
}

export interface ExercisePR {
  exerciseId: number;
  maxWeightKg: number;
  maxWeightDate: string;
  bestEstimated1RM: number;
  bestEstimated1RMDate: string;
  maxSessionVolume: number;
  maxSessionVolumeDate: string;
}
