import { MuscleGroup } from '../types';

interface SeedExercise {
  name: string;
  category: 'upper' | 'lower';
  muscleGroup: MuscleGroup;
}

export const DEFAULT_EXERCISES: SeedExercise[] = [
  // Pecs
  { name: 'Développé couché barre', category: 'upper', muscleGroup: 'pecs' },
  { name: 'Développé incliné haltères', category: 'upper', muscleGroup: 'pecs' },
  { name: 'Écarté couché haltères', category: 'upper', muscleGroup: 'pecs' },
  { name: 'Dips', category: 'upper', muscleGroup: 'pecs' },
  // Dos
  { name: 'Tractions', category: 'upper', muscleGroup: 'dos' },
  { name: 'Rowing barre', category: 'upper', muscleGroup: 'dos' },
  { name: 'Tirage horizontal poulie', category: 'upper', muscleGroup: 'dos' },
  { name: 'Tirage vertical poulie', category: 'upper', muscleGroup: 'dos' },
  // Épaules
  { name: 'Développé militaire', category: 'upper', muscleGroup: 'epaules' },
  { name: 'Élévations latérales', category: 'upper', muscleGroup: 'epaules' },
  { name: 'Oiseau (élévations arrière)', category: 'upper', muscleGroup: 'epaules' },
  // Bras
  { name: 'Curl biceps barre', category: 'upper', muscleGroup: 'bras' },
  { name: 'Curl biceps haltères', category: 'upper', muscleGroup: 'bras' },
  { name: 'Extension triceps poulie', category: 'upper', muscleGroup: 'bras' },
  { name: 'Dips triceps', category: 'upper', muscleGroup: 'bras' },
  // Quadriceps
  { name: 'Squat barre', category: 'lower', muscleGroup: 'quadriceps' },
  { name: 'Leg press', category: 'lower', muscleGroup: 'quadriceps' },
  { name: 'Fentes haltères', category: 'lower', muscleGroup: 'quadriceps' },
  { name: 'Leg extension', category: 'lower', muscleGroup: 'quadriceps' },
  // Ischios
  { name: 'Soulevé de terre roumain', category: 'lower', muscleGroup: 'ischios' },
  { name: 'Leg curl', category: 'lower', muscleGroup: 'ischios' },
  { name: 'Good morning', category: 'lower', muscleGroup: 'ischios' },
  // Fessiers
  { name: 'Hip thrust', category: 'lower', muscleGroup: 'fessiers' },
  { name: 'Squat sumo', category: 'lower', muscleGroup: 'fessiers' },
  // Mollets
  { name: 'Mollets debout', category: 'lower', muscleGroup: 'mollets' },
  { name: 'Mollets assis', category: 'lower', muscleGroup: 'mollets' },
];

// Tier 1 (Débutant) — 2 Full Body routines à alterner, 6 exercices de base chacune.
export const FULLBODY_A = [
  'Squat barre',
  'Développé couché barre',
  'Rowing barre',
  'Développé militaire',
  'Soulevé de terre roumain',
  'Curl biceps barre',
];

export const FULLBODY_B = [
  'Leg press',
  'Développé incliné haltères',
  'Tractions',
  'Élévations latérales',
  'Hip thrust',
  'Extension triceps poulie',
];
