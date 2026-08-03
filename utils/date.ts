export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function todayKey(): string {
  return toDateKey(new Date());
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day; // Monday as first day
  return addDays(d, diff);
}

export function formatWeekdayShort(date: Date): string {
  return date.toLocaleDateString('fr-FR', { weekday: 'short' });
}

export function formatDayLabel(date: Date): string {
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

/** yyyy-mm-dd -> a locale-appropriate long date ("31 juillet 2026" / "July 31, 2026" / ...) —
 * for shareable cards and other places a raw ISO date shouldn't be shown as-is. */
export function formatLongDate(dateKey: string, locale: string): string {
  const date = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateKey;
  return date.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
}
