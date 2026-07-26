import { MuscleGroup } from '../types';

interface SeedExercise {
  name: string;
  category: 'upper' | 'lower';
  muscleGroup: MuscleGroup;
}

export const DEFAULT_EXERCISES: SeedExercise[] = [
  // Haut
  { name: 'Chest press', category: 'upper', muscleGroup: 'pecs' },
  { name: 'Biceps haltère prise marteau', category: 'upper', muscleGroup: 'bras' },
  { name: 'Poulie extension triceps en haut', category: 'upper', muscleGroup: 'bras' },
  { name: 'Poulie extension triceps au-dessus de la tête', category: 'upper', muscleGroup: 'bras' },
  { name: 'Shrug', category: 'upper', muscleGroup: 'dos' },
  { name: 'Élévation latérale haltère', category: 'upper', muscleGroup: 'epaules' },
  { name: 'Low row', category: 'upper', muscleGroup: 'dos' },
  { name: 'Pull down', category: 'upper', muscleGroup: 'dos' },
  { name: 'Lat machine', category: 'upper', muscleGroup: 'dos' },
  // Bas
  { name: 'Abducteur', category: 'lower', muscleGroup: 'fessiers' },
  { name: 'Leg curl', category: 'lower', muscleGroup: 'ischios' },
  { name: 'Leg extension', category: 'lower', muscleGroup: 'quadriceps' },
  { name: 'Adducteur', category: 'lower', muscleGroup: 'fessiers' },
  { name: 'Rear kick', category: 'lower', muscleGroup: 'fessiers' },
  { name: 'Hip thrust', category: 'lower', muscleGroup: 'fessiers' },
];
