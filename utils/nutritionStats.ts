import { BodyWeightEntry, ProteinEntry } from '../types';
import { addDays, toDateKey } from './date';

export function proteinTotalForDate(entries: ProteinEntry[], date: string): number {
  return entries.filter((e) => e.date === date).reduce((sum, e) => sum + e.grams, 0);
}

export interface DailyValue {
  date: string;
  value: number;
}

export function proteinDailySeries(entries: ProteinEntry[], days: number): DailyValue[] {
  const start = toDateKey(addDays(new Date(), -days + 1));
  const totals = new Map<string, number>();
  for (const e of entries) {
    if (e.date < start) continue;
    totals.set(e.date, (totals.get(e.date) ?? 0) + e.grams);
  }
  const series: DailyValue[] = [];
  for (let i = 0; i < days; i++) {
    const date = toDateKey(addDays(new Date(), -days + 1 + i));
    series.push({ date, value: totals.get(date) ?? 0 });
  }
  return series;
}

export function latestBodyWeight(entries: BodyWeightEntry[]): number | null {
  if (entries.length === 0) return null;
  return entries[0].weightKg; // already ordered by date DESC
}

export function bodyWeightSeries(entries: BodyWeightEntry[], days: number): DailyValue[] {
  const start = toDateKey(addDays(new Date(), -days));
  return [...entries]
    .filter((e) => e.date >= start)
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map((e) => ({ date: e.date, value: e.weightKg }));
}
