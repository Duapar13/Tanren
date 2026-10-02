import { useMemo } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '../../components/ScreenHeader';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { Card } from '../../components/Card';
import { Section } from '../../components/Section';
import { RankEmblem } from '../../components/RankEmblem';
import { StatTile } from '../../components/StatTile';
import { Button } from '../../components/Button';
import { ProgressBar } from '../../components/ProgressBar';
import { WeekStrip } from '../../components/WeekStrip';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../hooks/useTranslation';
import { Radius, Spacing } from '../../constants/theme';
import { isTrainingDay } from '../../utils/program';
import { toDateKey, todayKey } from '../../utils/date';
import { sessionsInCurrentWeek, weeklyTarget } from '../../utils/workoutStats';
import {
  computePlacementStatus,
  computeSeasonRanking,
  POINTS_PER_DIVISION,
  RANK_COLORS,
} from '../../utils/ranking';

export default function DashboardScreen() {
  const { sessions, sets, nutritionEntries, bodyWeightEntries, measurementEntries } = useData();
  const { user } = useAuth();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const SKILL_LABELS = t.skills;

  const trainingDays = user?.trainingDays ?? [];
  const measurementsEnabled = user?.measurementsEnabled ?? false;

  const isRestToday = !isTrainingDay(new Date(), trainingDays);

  const weekSessions = sessionsInCurrentWeek(sessions);

  const rankingParams = useMemo(
    () => ({
      sessions,
      sets,
      nutritionEntries,
      bodyWeightEntries,
      measurementEntries,
      measurementsEnabled,
      trainingDays,
      goal: user?.goal ?? ('maintain' as const),
      accountCreatedAt: user?.createdAt ? toDateKey(new Date(user.createdAt)) : todayKey(),
    }),
    [sessions, sets, nutritionEntries, bodyWeightEntries, measurementEntries, measurementsEnabled, trainingDays, user]
  );
  const ranking = useMemo(() => computeSeasonRanking(rankingParams), [rankingParams]);
  const placement = useMemo(
    () => computePlacementStatus(rankingParams, ranking.seasonInfo),
    [rankingParams, ranking.seasonInfo]
  );
  const rankColor = RANK_COLORS[ranking.state.rank];
  const inPlacement = placement.applicable && placement.inPlacement;
  const topSkills = (Object.entries(ranking.breakdown) as [keyof typeof SKILL_LABELS, number][]).filter(
    ([key]) => key !== 'measurement' || measurementsEnabled
  ).sort((a, b) => b[1] - a[1]);

  return (
    <ThemedView variant="grouped" style={{ flex: 1 }}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScreenHeader title={t.tabs.home} mascot="default" />
        <ScrollView
          contentContainerStyle={{
            padding: Spacing.lg,
            gap: Spacing.xl,
            paddingBottom: Spacing.xxl * 2,
          }}
          showsVerticalScrollIndicator={false}
        >
          <Card variant={isRestToday ? 'default' : 'accent'} style={{ gap: Spacing.md, paddingVertical: Spacing.xl }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
              <Ionicons
                name={isRestToday ? 'moon' : 'flame'}
                size={18}
                color={isRestToday ? colors.textSecondary : colors.accent}
              />
              <ThemedText variant="footnote" weight="700" color="secondary" style={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>
                {t.dashboard.today}
              </ThemedText>
            </View>
            <ThemedText variant="title1">
              {isRestToday ? t.dashboard.restDay : t.dashboard.trainingDay}
            </ThemedText>
            {!isRestToday && (
              <Button title={t.dashboard.startSession} onPress={() => router.push('/(tabs)/seance')} />
            )}
          </Card>

          <Section title={t.dashboard.thisWeek}>
            <Card style={{ gap: Spacing.md }}>
              <WeekStrip sessions={sessions} trainingDays={trainingDays} />
              <StatTile
                label={t.dashboard.sessionsDone}
                value={`${weekSessions.length} / ${weeklyTarget(trainingDays)}`}
              />
            </Card>
          </Section>

          <Section title={t.dashboard.yourRank}>
            <Pressable onPress={() => router.push('/(tabs)/rang')} style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}>
              <Card style={{ gap: Spacing.md }}>
                {inPlacement ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.lg }}>
                    <RankEmblem rank={null} size={64} />
                    <View style={{ flex: 1, gap: 8 }}>
                      <ThemedText variant="headline">{t.rang.placementTitle}</ThemedText>
                      <ProgressBar
                        progress={placement.sessionsCompleted / placement.sessionsNeeded}
                        tintColor={colors.accent}
                        height={8}
                      />
                      <ThemedText variant="caption" color="secondary">
                        {t.rang.placementProgress(placement.sessionsCompleted, placement.sessionsNeeded)}
                      </ThemedText>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
                  </View>
                ) : (
                  <>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.lg }}>
                      <RankEmblem rank={ranking.state.rank} size={64} />
                      <View style={{ flex: 1, gap: 8 }}>
                        <ThemedText variant="headline" style={{ color: rankColor }}>
                          {ranking.state.rank} {ranking.state.division}
                        </ThemedText>
                        <ProgressBar
                          progress={ranking.state.pointsInDivision / POINTS_PER_DIVISION}
                          tintColor={rankColor}
                          height={8}
                        />
                        <ThemedText variant="caption" color="secondary">
                          {ranking.totalPoints} pts
                        </ThemedText>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
                    </View>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
                      {topSkills.slice(0, 3).map(([key, pts]) => (
                        <View
                          key={key}
                          style={{
                            paddingHorizontal: 10,
                            paddingVertical: 4,
                            borderRadius: Radius.pill,
                            backgroundColor: colors.fill,
                          }}
                        >
                          <ThemedText variant="caption" weight="700" color="secondary">
                            {SKILL_LABELS[key]} {pts >= 0 ? '+' : ''}
                            {pts}
                          </ThemedText>
                        </View>
                      ))}
                    </View>
                  </>
                )}
              </Card>
            </Pressable>
          </Section>

          {sessions.length === 0 && (
            <Card>
              <ThemedText color="secondary" style={{ textAlign: 'center' }}>
                {t.dashboard.firstSessionPrompt}
              </ThemedText>
            </Card>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}
