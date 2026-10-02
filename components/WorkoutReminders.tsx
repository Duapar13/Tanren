import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../hooks/useTranslation';
import { usePreference } from '../lib/preferences';
import { scheduleWorkoutReminders } from '../lib/reminders';
import { todayKey } from '../utils/date';

/** Headless: keeps the local workout-reminder notifications in sync with the settings, the
 * program, and whether today's workout is already done. */
export function WorkoutReminders() {
  const { sessions } = useData();
  const { user } = useAuth();
  const { t } = useTranslation();
  const enabled = usePreference('reminderEnabled');
  const hour = usePreference('reminderHour');
  const minute = usePreference('reminderMinute');

  const trainedToday = sessions.some((s) => s.date === todayKey());
  const trainingDays = user?.trainingDays ?? [];
  const trainingKey = trainingDays.join(',');
  const title = t.profil.reminderNotifTitle;
  const body = t.profil.reminderNotifBody;

  useEffect(() => {
    const plan = () =>
      scheduleWorkoutReminders({
        enabled,
        hour,
        minute,
        trainingDays: trainingKey ? trainingKey.split(',').map(Number) : [],
        trainedToday,
        title,
        body,
      }).catch((err) => console.warn('[reminders] schedule failed', err));

    plan();
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') plan();
    });
    return () => sub.remove();
  }, [enabled, hour, minute, trainingKey, trainedToday, title, body]);

  return null;
}
