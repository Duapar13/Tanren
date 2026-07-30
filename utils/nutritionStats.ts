import { BodyWeightEntry, NutritionEntry } from '../types';
import { addDays, toDateKey } from './date';

export interface DailyValue {
  date: string;
  value: number;
}

export interface DailyMacros {
  date: string;
  proteinG: number;
  carbsG: number;
  fatG: number;
  calories: number;
}

function caloriesFor(proteinG: number, carbsG: number, fatG: number): number {
  return proteinG * 4 + carbsG * 4 + fatG * 9;
}

export function macroTotalsForDate(entries: NutritionEntry[], date: string): DailyMacros {
  const dayEntries = entries.filter((e) => e.date === date);
  const proteinG = dayEntries.reduce((sum, e) => sum + e.proteinG, 0);
  const carbsG = dayEntries.reduce((sum, e) => sum + e.carbsG, 0);
  const fatG = dayEntries.reduce((sum, e) => sum + e.fatG, 0);
  return { date, proteinG, carbsG, fatG, calories: caloriesFor(proteinG, carbsG, fatG) };
}

export function macroDailySeries(entries: NutritionEntry[], days: number): DailyMacros[] {
  const start = toDateKey(addDays(new Date(), -days + 1));
  const totals = new Map<string, { proteinG: number; carbsG: number; fatG: number }>();
  for (const e of entries) {
    if (e.date < start) continue;
    const t = totals.get(e.date) ?? { proteinG: 0, carbsG: 0, fatG: 0 };
    t.proteinG += e.proteinG;
    t.carbsG += e.carbsG;
    t.fatG += e.fatG;
    totals.set(e.date, t);
  }
  const series: DailyMacros[] = [];
  for (let i = 0; i < days; i++) {
    const date = toDateKey(addDays(new Date(), -days + 1 + i));
    const t = totals.get(date) ?? { proteinG: 0, carbsG: 0, fatG: 0 };
    series.push({ date, ...t, calories: caloriesFor(t.proteinG, t.carbsG, t.fatG) });
  }
  return series;
}

export function latestBodyWeight(entries: BodyWeightEntry[]): number | null {
  if (entries.length === 0) return null;
  // entries are ordered by date DESC, id DESC (secondary sort breaks ties between same-day entries)
  return entries[0].weightKg;
}

export function bodyWeightSeries(entries: BodyWeightEntry[], days: number): DailyValue[] {
  const start = toDateKey(addDays(new Date(), -days));
  return [...entries]
    .filter((e) => e.date >= start)
    .sort((a, b) => (a.date === b.date ? a.id - b.id : a.date < b.date ? -1 : 1))
    .map((e) => ({ date: e.date, value: e.weightKg }));
}
