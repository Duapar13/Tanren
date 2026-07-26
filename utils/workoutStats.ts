import { Profile, WorkoutSession } from '../types';
import { startOfWeek, toDateKey, addDays } from './date';

export function sessionsInCurrentWeek(sessions: WorkoutSession[]): WorkoutSession[] {
  const start = toDateKey(startOfWeek(new Date()));
  const end = toDateKey(addDays(startOfWeek(new Date()), 6));
  return sessions.filter((s) => s.date >= start && s.date <= end);
}

// Nombre de séances "attendues" par semaine selon le programme.
export function weeklyTarget(profile: Profile): number {
  return profile.programType === 'split' ? 5 : 3;
}

export function sessionsInLastDays(
  sessions: WorkoutSession[],
  days: number
): WorkoutSession[] {
  const start = toDateKey(addDays(new Date(), -days));
  return sessions.filter((s) => s.date >= start);
}
