import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ScreenHeader } from '../../components/ScreenHeader';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { Card } from '../../components/Card';
import { MonthlyCalendar } from '../../components/MonthlyCalendar';
import { StatTile } from '../../components/StatTile';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../hooks/useTranslation';
import { Spacing } from '../../constants/theme';
import { toDateKey, todayKey } from '../../utils/date';
import { isTrainingDay } from '../../utils/program';

export default function ProgressionScreen() {
  const { sessions } = useData();
  const { user } = useAuth();
  const { t } = useTranslation();

  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  const yearStats = useMemo(() => {
    const year = now.getFullYear();
    const today = todayKey();
    const loggedDates = new Set(sessions.map((s) => s.date));
    const trainingDays = user?.trainingDays ?? [];
    let done = 0;
    let missed = 0;
    const cursor = new Date(year, 0, 1);
    while (cursor.getFullYear() === year) {
      const key = toDateKey(cursor);
      if (key > today) break;
      if (loggedDates.has(key)) done++;
      else if (isTrainingDay(cursor, trainingDays)) missed++;
      cursor.setDate(cursor.getDate() + 1);
    }
    return { done, missed };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessions, user?.trainingDays]);

  return (
    <ThemedView variant="grouped" style={{ flex: 1 }}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScreenHeader mascot="excited" />
        <ScrollView
          contentContainerStyle={{
            padding: Spacing.lg,
            gap: Spacing.lg,
            paddingBottom: Spacing.xxl,
          }}
        >
          <View>
            <ThemedText variant="headline" style={{ marginBottom: Spacing.sm }}>
              {t.progression.regularity}
            </ThemedText>
            <Card>
              <MonthlyCalendar
                year={viewYear}
                month={viewMonth}
                sessions={sessions}
                trainingDays={user?.trainingDays ?? []}
                onChangeMonth={(y, m) => {
                  setViewYear(y);
                  setViewMonth(m);
                }}
                onDayPress={(date) => router.push({ pathname: '/session-detail', params: { date } })}
                onStatsPress={() =>
                  router.push({
                    pathname: '/month-recap',
                    params: { year: String(viewYear), month: String(viewMonth) },
                  })
                }
              />
            </Card>
          </View>

          <View>
            <ThemedText variant="headline" style={{ marginBottom: Spacing.sm }}>
              {t.progression.thisYear}
            </ThemedText>
            <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
              <StatTile label={t.dashboard.sessionsDone} value={String(yearStats.done)} />
              <StatTile label={t.progression.missedSessions} value={String(yearStats.missed)} />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}
