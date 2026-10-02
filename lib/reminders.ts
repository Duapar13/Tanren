import * as Notifications from 'expo-notifications';

const KIND = 'workout-reminder';
const HORIZON_DAYS = 14;

export async function requestReminderPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.status === 'granted') return true;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.status === 'granted';
}

async function cancelReminders(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.content.data?.kind === KIND)
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
  );
}

interface ReminderPlan {
  enabled: boolean;
  hour: number;
  minute: number;
  /** 0 = Sunday … 6 = Saturday (same convention as the profile's training days). */
  trainingDays: number[];
  trainedToday: boolean;
  title: string;
  body: string;
}

/** Schedules one-off local notifications for the next two weeks at the chosen time, on training days.
 * One-offs (rather than a repeating weekly trigger) so today's can be skipped once a workout is
 * logged; the plan is rebuilt whenever settings change, the app is opened, or a session is saved.
 * Local notifications need no network, so reminders keep working fully offline. */
export async function scheduleWorkoutReminders(plan: ReminderPlan): Promise<void> {
  await cancelReminders();
  if (!plan.enabled) return;

  const now = new Date();
  for (let offset = 0; offset < HORIZON_DAYS; offset++) {
    const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, plan.hour, plan.minute, 0, 0);
    if (at.getTime() <= now.getTime() + 30_000) continue;
    if (!plan.trainingDays.includes(at.getDay())) continue;
    if (offset === 0 && plan.trainedToday) continue;
    await Notifications.scheduleNotificationAsync({
      content: { title: plan.title, body: plan.body, data: { kind: KIND } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at },
    });
  }
}
