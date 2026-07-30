import { NutritionGoal } from '../types';

export function proteinTargetGrams(bodyWeightKg: number): number {
  return bodyWeightKg * 1.8;
}

export function bmi(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}

export function bmiCategory(value: number): string {
  if (value < 18.5) return 'Insuffisance pondérale';
  if (value < 25) return 'Poids normal';
  if (value < 30) return 'Surpoids';
  return 'Obésité';
}

const GOAL_CALORIE_MULTIPLIER: Record<NutritionGoal, number> = {
  bulk: 1.1,
  cut: 0.8,
  maintain: 1,
};

export const GOAL_LABELS: Record<NutritionGoal, string> = {
  bulk: 'Prise de masse',
  cut: 'Sèche',
  maintain: 'Maintien',
};

export interface MacroTargets {
  calories: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
}

/**
 * Estimation simple (pas de suivi âge/sexe/activité) : maintenance ≈ poids × 33 kcal,
 * ajustée selon l'objectif. Protéines à 1,8 g/kg, lipides à 25% des calories, le reste en glucides.
 */
export function macroTargets(bodyWeightKg: number, goal: NutritionGoal): MacroTargets {
  const maintenanceCalories = bodyWeightKg * 33;
  const calories = Math.round(maintenanceCalories * GOAL_CALORIE_MULTIPLIER[goal]);
  const proteinG = Math.round(proteinTargetGrams(bodyWeightKg));
  const fatG = Math.round((calories * 0.25) / 9);
  const carbsG = Math.max(0, Math.round((calories - proteinG * 4 - fatG * 9) / 4));
  return { calories, proteinG, fatG, carbsG };
}
