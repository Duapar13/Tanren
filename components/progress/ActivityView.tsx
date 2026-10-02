import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '../ThemedText';
import { Card } from '../Card';
import { Section } from '../Section';
import { StatTile } from '../StatTile';
import { EmptyState } from '../EmptyState';
import { MonthlyCalendar } from '../MonthlyCalendar';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../hooks/useTranslation';
import { Spacing } from '../../constants/theme';
import { toDateKey, todayKey } from '../../utils/date';
import { isTrainingDay } from '../../utils/program';
import { computeExercisePRs } from '../../utils/prStats';
import { formatWeight } from '../../utils/units';

const RECORDS_PREVIEW = 5;

/** Calendar of trained days, year counters and the personal-records list (each opens the exercise chart). */
export function ActivityView() {
  const { sessions, sets, exercises } = useData();
  const { user } = useAuth();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const weightUnit = user?.weightUnit ?? 'kg';

  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [showAllRecords, setShowAllRecords] = useState(false);

  const yearStats = useMemo(() => {
    const year = new Date().getFullYear();
    const today = todayKey();
    const loggedDates = new Set(sessions.map((s) => s.date));
    const trainingDays = user?.trainingDays ?? [];
    let done = 0;
    let missed = 0;
    // Never count days before the account existed — a fresh account created mid-year
    // shouldn't show months of "missed" sessions it was never possible to log.
    const jan1 = new Date(year, 0, 1);
    const createdAt = user?.createdAt ? new Date(user.createdAt) : jan1;
    const cursor = createdAt > jan1 ? createdAt : jan1;
    while (cursor.getFullYear() === year) {
      const key = toDateKey(cursor);
      if (key > today) break;
      if (loggedDates.has(key)) done++;
      else if (isTrainingDay(cursor, trainingDays)) missed++;
      cursor.setDate(cursor.getDate() + 1);
    }
    return { done, missed };
  }, [sessions, user?.trainingDays, user?.createdAt]);

  const records = useMemo(() => {
    const prs = computeExercisePRs(sets, sessions);
    return Array.from(prs.values())
      .map((pr) => ({ pr, exercise: exercises.find((e) => e.id === pr.exerciseId) }))
      .filter((r) => !!r.exercise && !r.exercise.deletedAt)
      .sort((a, b) => b.pr.bestEstimated1RM - a.pr.bestEstimated1RM);
  }, [sets, sessions, exercises]);

  const visibleRecords = showAllRecords ? records : records.slice(0, RECORDS_PREVIEW);

  return (
    <View style={{ gap: Spacing.xl }}>
      <Section title={t.progression.regularity}>
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
      </Section>

      <Section title={t.progression.thisYear}>
        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
          <StatTile label={t.dashboard.sessionsDone} value={String(yearStats.done)} />
          <StatTile label={t.progression.missedSessions} value={String(yearStats.missed)} />
        </View>
      </Section>

      <Section title={t.progression.personalRecords}>
        {records.length === 0 ? (
          <Card>
            <EmptyState icon="trophy-outline" text={t.progression.noExerciseDataPrompt} />
          </Card>
        ) : (
          <Card style={{ padding: Spacing.sm, gap: 2 }}>
            {visibleRecords.map(({ pr, exercise }) => (
              <Pressable
                key={pr.exerciseId}
                onPress={() => router.push({ pathname: '/exercise/[id]', params: { id: String(pr.exerciseId) } })}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: Spacing.md,
                  minHeight: 56,
                  paddingHorizontal: Spacing.md,
                  borderRadius: 12,
                  backgroundColor: pressed ? colors.fill : 'transparent',
                })}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 12,
                    backgroundColor: colors.accentSoft,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="trophy" size={16} color={colors.accent} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <ThemedText variant="subhead" weight="700" numberOfLines={1}>
                    {exercise!.name}
                  </ThemedText>
                  <ThemedText variant="footnote" color="tertiary">
                    {t.progression.maxWeight} {formatWeight(pr.maxWeightKg, weightUnit)}
                  </ThemedText>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <ThemedText variant="subhead" weight="800" color="accent">
                    {formatWeight(pr.bestEstimated1RM, weightUnit)}
                  </ThemedText>
                  <ThemedText variant="caption" color="tertiary">
                    {t.progression.est1RM}
                  </ThemedText>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
              </Pressable>
            ))}
            {records.length > RECORDS_PREVIEW && (
              <Pressable
                onPress={() => setShowAllRecords((v) => !v)}
                style={{ alignItems: 'center', paddingVertical: Spacing.md }}
              >
                <ThemedText variant="subhead" weight="700" color="accent">
                  {showAllRecords ? t.progress.showLess : t.progress.showAll(records.length)}
                </ThemedText>
              </Pressable>
            )}
          </Card>
        )}
      </Section>
    </View>
  );
}
