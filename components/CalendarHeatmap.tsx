import { View } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { Radius, Spacing } from '../constants/theme';
import { ThemedText } from './ThemedText';
import { SplitType, WorkoutSession } from '../types';
import { addDays, startOfWeek, toDateKey, todayKey } from '../utils/date';
import { getSessionTypeForDate } from '../utils/program';

const WEEKS = 8;

interface Props {
  sessions: WorkoutSession[];
  trainingDays: number[];
  splitType: SplitType;
}

export function CalendarHeatmap({ sessions, trainingDays, splitType }: Props) {
  const { colors } = useTheme();
  const loggedDates = new Set(sessions.map((s) => s.date));
  const today = todayKey();
  const gridStart = addDays(startOfWeek(new Date()), -7 * (WEEKS - 1));

  const weeks = Array.from({ length: WEEKS }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => addDays(gridStart, w * 7 + d))
  );

  return (
    <View style={{ gap: 4 }}>
      {weeks.map((week, wi) => (
        <View key={wi} style={{ flexDirection: 'row', gap: 4 }}>
          {week.map((day) => {
            const key = toDateKey(day);
            const isFuture = key > today;
            const done = loggedDates.has(key);
            const isRest = getSessionTypeForDate(day, trainingDays, splitType) === 'rest';
            const missed = !isFuture && !done && !isRest;

            return (
              <View
                key={key}
                style={{
                  flex: 1,
                  aspectRatio: 1,
                  borderRadius: Radius.sm - 4,
                  backgroundColor: done
                    ? colors.accent
                    : missed
                      ? colors.fillSecondary
                      : 'transparent',
                  borderWidth: 1,
                  borderColor: isFuture ? colors.separator : colors.border,
                  opacity: isFuture ? 0.3 : 1,
                }}
              />
            );
          })}
        </View>
      ))}
      <View style={{ flexDirection: 'row', gap: Spacing.md, marginTop: 4 }}>
        <Legend color={colors.accent} label="Faite" />
        <Legend color={colors.fillSecondary} label="Manquée" />
      </View>
    </View>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: color }} />
      <ThemedText variant="caption" color="tertiary">
        {label}
      </ThemedText>
    </View>
  );
}
