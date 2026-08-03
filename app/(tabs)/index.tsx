import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { ScreenHeader } from '../../components/ScreenHeader';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { Card } from '../../components/Card';
import { StatTile } from '../../components/StatTile';
import { Button } from '../../components/Button';
import { ProgressBar } from '../../components/ProgressBar';
import { WeekStrip } from '../../components/WeekStrip';
import { GuidedTour } from '../../components/GuidedTour';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../hooks/useTranslation';
import { Spacing } from '../../constants/theme';
import { isTrainingDay } from '../../utils/program';
import { toDateKey, todayKey } from '../../utils/date';
import { sessionsInCurrentWeek, weeklyTarget } from '../../utils/workoutStats';
import { computeSeasonRanking, POINTS_PER_DIVISION, RANK_COLORS } from '../../utils/ranking';
import { hasSeenTour, markTourSeen } from '../../lib/tour';

export default function DashboardScreen() {
  const { sessions, sets, nutritionEntries, bodyWeightEntries, measurementEntries } = useData();
  const { user } = useAuth();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const tabBarHeight = useBottomTabBarHeight();
  const SKILL_LABELS = t.skills;

  const trainingDays = user?.trainingDays ?? [];
  const measurementsEnabled = user?.measurementsEnabled ?? false;

  const [showTour, setShowTour] = useState(false);
  useEffect(() => {
    if (!user) return;
    hasSeenTour(user.id).then((seen) => {
      if (!seen) setShowTour(true);
    });
  }, [user]);

  const finishTour = () => {
    setShowTour(false);
    if (user) markTourSeen(user.id);
  };

  const isRestToday = !isTrainingDay(new Date(), trainingDays);

  const weekSessions = sessionsInCurrentWeek(sessions);

  const ranking = useMemo(
    () =>
      computeSeasonRanking({
        sessions,
        sets,
        nutritionEntries,
        bodyWeightEntries,
        measurementEntries,
        measurementsEnabled,
        trainingDays,
        goal: user?.goal ?? 'maintain',
        accountCreatedAt: user?.createdAt ? toDateKey(new Date(user.createdAt)) : todayKey(),
      }),
    [sessions, sets, nutritionEntries, bodyWeightEntries, measurementEntries, measurementsEnabled, trainingDays, user]
  );
  const rankColor = RANK_COLORS[ranking.state.rank];
  const topSkills = (Object.entries(ranking.breakdown) as [keyof typeof SKILL_LABELS, number][]).filter(
    ([key]) => key !== 'measurement' || measurementsEnabled
  ).sort((a, b) => b[1] - a[1]);

  return (
    <ThemedView variant="grouped" style={{ flex: 1 }}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScreenHeader mascot="default" />
        <ScrollView
          contentContainerStyle={{
            padding: Spacing.lg,
            gap: Spacing.lg,
            paddingBottom: Spacing.xxl,
          }}
        >
          <Card style={{ gap: Spacing.sm }}>
            <ThemedText variant="footnote" color="secondary">
              {t.dashboard.today}
            </ThemedText>
            <ThemedText variant="title1" weight="700">
              {isRestToday ? t.dashboard.restDay : t.dashboard.trainingDay}
            </ThemedText>
            {!isRestToday && (
              <Button
                title={t.dashboard.startSession}
                onPress={() => router.push('/(tabs)/seance')}
              />
            )}
          </Card>

          <View>
            <ThemedText variant="headline" style={{ marginBottom: Spacing.sm }}>
              {t.dashboard.thisWeek}
            </ThemedText>
            <Card style={{ gap: Spacing.md }}>
              <WeekStrip sessions={sessions} trainingDays={trainingDays} />
              <StatTile
                label={t.dashboard.sessionsDone}
                value={`${weekSessions.length} / ${weeklyTarget(trainingDays)}`}
              />
            </Card>
          </View>

          <View>
            <ThemedText variant="headline" style={{ marginBottom: Spacing.sm }}>
              {t.dashboard.yourRank}
            </ThemedText>
            <Pressable onPress={() => router.push('/(tabs)/rang')}>
              <Card style={{ gap: Spacing.md }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
                  <View
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 999,
                      backgroundColor: rankColor + '26',
                      borderWidth: 2,
                      borderColor: rankColor,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name="shield" size={26} color={rankColor} />
                  </View>
                  <View style={{ flex: 1, gap: 6 }}>
                    <ThemedText variant="body" weight="700">
                      {ranking.state.rank} {ranking.state.division}
                    </ThemedText>
                    <ProgressBar
                      progress={ranking.state.pointsInDivision / POINTS_PER_DIVISION}
                      tintColor={rankColor}
                      height={6}
                    />
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
                </View>
                <ThemedText variant="caption" color="tertiary">
                  {topSkills.map(([key, pts]) => `${SKILL_LABELS[key]} ${pts >= 0 ? '+' : ''}${pts}`).join(' · ')}
                </ThemedText>
              </Card>
            </Pressable>
          </View>

          {sessions.length === 0 && (
            <Card>
              <ThemedText color="secondary" style={{ textAlign: 'center' }}>
                {t.dashboard.firstSessionPrompt}
              </ThemedText>
            </Card>
          )}
        </ScrollView>

        <GuidedTour visible={showTour} onFinish={finishTour} tabBarHeight={tabBarHeight} />
      </SafeAreaView>
    </ThemedView>
  );
}
