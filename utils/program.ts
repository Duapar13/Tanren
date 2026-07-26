export type SplitDayType = 'upper' | 'lower' | 'rest';

// Lundi=Haut, Mardi=Bas, Mercredi=Haut, Jeudi=Bas, Vendredi=Haut, Sam/Dim=Repos
const SPLIT_SCHEDULE: Record<number, SplitDayType> = {
  0: 'rest', // dimanche
  1: 'upper', // lundi
  2: 'lower', // mardi
  3: 'upper', // mercredi
  4: 'lower', // jeudi
  5: 'upper', // vendredi
  6: 'rest', // samedi
};

export function getSplitDayType(date: Date): SplitDayType {
  return SPLIT_SCHEDULE[date.getDay()];
}

export const SPLIT_DAY_LABELS: Record<SplitDayType, string> = {
  upper: 'Haut du corps',
  lower: 'Bas du corps',
  rest: 'Repos',
};
