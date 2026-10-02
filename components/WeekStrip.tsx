import { View } from 'react-native';
import { ThemedText } from './ThemedText';
import { useTheme } from '../hooks/useTheme';
import { Radius } from '../constants/theme';
import { WorkoutSession } from '../types';
import { addDays, formatWeekdayShort, startOfWeek, toDateKey, todayKey } from '../utils/date';
import { isTrainingDay } from '../utils/program';

interface Props {
  sessions: WorkoutSession[];
  trainingDays: number[];
}

export function WeekStrip({ sessions, trainingDays }: Props) {
  const { colors } = useTheme();
  const loggedDates = new Set(sessions.map((s) => s.date));
  const monday = startOfWeek(new Date());
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const today = todayKey();

  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {days.map((day) => {
        const key = toDateKey(day);
        const isToday = key === today;
        const done = loggedDates.has(key);
        const isRest = !isTrainingDay(day, trainingDays);

        return (
          <View key={key} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
            <ThemedText variant="caption" color="tertiary" style={{ textTransform: 'capitalize' }}>
              {formatWeekdayShort(day)}
            </ThemedText>
            <View
              style={{
                width: 30,
                height: 30,
                borderRadius: Radius.pill,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: done ? colors.accent : 'transparent',
                borderWidth: isToday && !done ? 2 : 1,
                borderColor: isToday ? colors.accent : colors.separator,
                opacity: isRest && !done ? 0.4 : 1,
              }}
            >
              <ThemedText
                variant="caption"
                weight="600"
                style={{ color: done ? colors.onAccent : colors.textSecondary }}
              >
                {day.getDate()}
              </ThemedText>
            </View>
          </View>
        );
      })}
    </View>
  );
}
