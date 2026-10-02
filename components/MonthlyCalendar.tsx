import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from './ThemedText';
import { useTheme } from '../hooks/useTheme';
import { LOCALE_MAP, useTranslation } from '../hooks/useTranslation';
import { Radius, Spacing } from '../constants/theme';
import { WorkoutSession } from '../types';
import { toDateKey, todayKey } from '../utils/date';
import { isTrainingDay } from '../utils/program';

const WEEKDAY_LABELS: Record<string, string[]> = {
  fr: ['L', 'M', 'M', 'J', 'V', 'S', 'D'],
  en: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
  it: ['L', 'M', 'M', 'G', 'V', 'S', 'D'],
  es: ['L', 'M', 'M', 'J', 'V', 'S', 'D'],
};

interface Props {
  year: number;
  month: number; // 0-11
  sessions: WorkoutSession[];
  trainingDays: number[];
  onChangeMonth: (year: number, month: number) => void;
  onDayPress: (dateKey: string) => void;
  onStatsPress: () => void;
}

function monthLabel(year: number, month: number, locale: string): string {
  const label = new Date(year, month, 1).toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function MonthlyCalendar({ year, month, sessions, trainingDays, onChangeMonth, onDayPress, onStatsPress }: Props) {
  const { colors } = useTheme();
  const { t, lang } = useTranslation();
  const loggedDates = new Set(sessions.map((s) => s.date));
  const today = todayKey();

  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // Monday-first weekday index (0=Monday..6=Sunday) for the 1st of the month, to know how much
  // leading blank padding the grid needs.
  const leadingBlanks = (firstOfMonth.getDay() + 6) % 7;

  const cells: (number | null)[] = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const goPrev = () => {
    const d = new Date(year, month - 1, 1);
    onChangeMonth(d.getFullYear(), d.getMonth());
  };
  const goNext = () => {
    const d = new Date(year, month + 1, 1);
    onChangeMonth(d.getFullYear(), d.getMonth());
  };

  return (
    <View style={{ gap: Spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pressable onPress={goPrev} hitSlop={8} style={{ padding: 4 }}>
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </Pressable>
        <ThemedText variant="subhead" weight="700">
          {monthLabel(year, month, LOCALE_MAP[lang])}
        </ThemedText>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
          <Pressable onPress={goNext} hitSlop={8} style={{ padding: 4 }}>
            <Ionicons name="chevron-forward" size={20} color={colors.text} />
          </Pressable>
          <Pressable
            onPress={onStatsPress}
            hitSlop={8}
            style={{
              width: 30,
              height: 30,
              borderRadius: Radius.sm,
              backgroundColor: colors.fill,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="stats-chart" size={16} color={colors.accent} />
          </Pressable>
        </View>
      </View>

      <View style={{ flexDirection: 'row' }}>
        {WEEKDAY_LABELS[lang].map((label, i) => (
          <ThemedText key={i} variant="caption" color="tertiary" style={{ flex: 1, textAlign: 'center' }}>
            {label}
          </ThemedText>
        ))}
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {cells.map((day, i) => {
          if (day === null) return <View key={i} style={{ width: `${100 / 7}%`, aspectRatio: 1 }} />;

          const date = new Date(year, month, day);
          const key = toDateKey(date);
          const isFuture = key > today;
          const done = loggedDates.has(key);
          const isTraining = isTrainingDay(date, trainingDays);
          const missed = !isFuture && !done && isTraining;

          return (
            <Pressable
              key={i}
              onPress={() => onDayPress(key)}
              disabled={!done}
              style={{ width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' }}
            >
              <View
                style={{
                  width: '78%',
                  height: '78%',
                  borderRadius: Radius.sm,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: done ? colors.accent : missed ? colors.fillSecondary : 'transparent',
                  borderWidth: key === today ? 2 : 0,
                  borderColor: colors.accent,
                }}
              >
                <ThemedText
                  variant="footnote"
                  weight={done ? '700' : '400'}
                  style={{ color: done ? colors.onAccent : isFuture ? colors.textTertiary : colors.text }}
                >
                  {day}
                </ThemedText>
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={{ flexDirection: 'row', gap: Spacing.md, marginTop: 4 }}>
        <Legend color={colors.accent} label={t.monthlyCalendar.done} />
        <Legend color={colors.fillSecondary} label={t.monthlyCalendar.missed} />
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
