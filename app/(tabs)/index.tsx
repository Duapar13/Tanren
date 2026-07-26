import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '../../components/ScreenHeader';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { Card } from '../../components/Card';
import { StatTile } from '../../components/StatTile';
import { Button } from '../../components/Button';
import { WeekStrip } from '../../components/WeekStrip';
import { useData } from '../../context/DataContext';
import { useTheme } from '../../hooks/useTheme';
import { Spacing } from '../../constants/theme';
import { getSplitDayType, SPLIT_DAY_LABELS } from '../../utils/program';
import { sessionsInCurrentWeek, WEEKLY_TARGET } from '../../utils/workoutStats';
import { findRecentPRs } from '../../utils/prStats';

export default function DashboardScreen() {
  const { sessions, sets } = useData();
  const { colors } = useTheme();

  const todaysPlanLabel = SPLIT_DAY_LABELS[getSplitDayType(new Date())];
  const isRestToday = getSplitDayType(new Date()) === 'rest';

  const weekSessions = sessionsInCurrentWeek(sessions);
  const recentPRs = findRecentPRs(sets, sessions);
  const topPR = recentPRs[0];

  return (
    <ThemedView variant="grouped" style={{ flex: 1 }}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScreenHeader />
        <ScrollView
          contentContainerStyle={{
            padding: Spacing.lg,
            gap: Spacing.lg,
            paddingBottom: Spacing.xxl,
          }}
        >
          <Card style={{ gap: Spacing.sm }}>
            <ThemedText variant="footnote" color="secondary">
              Aujourd’hui
            </ThemedText>
            <ThemedText variant="title1" weight="700">
              {todaysPlanLabel}
            </ThemedText>
            {!isRestToday && (
              <Button
                title="Démarrer la séance"
                onPress={() => router.push('/(tabs)/seance')}
              />
            )}
          </Card>

          <View>
            <ThemedText variant="headline" style={{ marginBottom: Spacing.sm }}>
              Cette semaine
            </ThemedText>
            <Card style={{ gap: Spacing.md }}>
              <WeekStrip sessions={sessions} />
              <StatTile
                label="Séances effectuées"
                value={`${weekSessions.length} / ${WEEKLY_TARGET}`}
              />
            </Card>
          </View>

          {topPR && (
            <View>
              <ThemedText variant="headline" style={{ marginBottom: Spacing.sm }}>
                Dernier record battu
              </ThemedText>
              <Card
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: Spacing.md,
                }}
              >
                <Ionicons name="trophy" size={28} color={colors.accent} />
                <View style={{ flex: 1 }}>
                  <ThemedText variant="body" weight="600">
                    {topPR.exerciseName}
                  </ThemedText>
                  <ThemedText variant="footnote" color="secondary">
                    {topPR.newBest1RM.toFixed(1)} kg (1RM est.)
                    {topPR.previousBest1RM > 0
                      ? ` · précédent : ${topPR.previousBest1RM.toFixed(1)} kg`
                      : ' · premier record'}
                  </ThemedText>
                </View>
              </Card>
            </View>
          )}

          {sessions.length === 0 && (
            <Card>
              <ThemedText color="secondary" style={{ textAlign: 'center' }}>
                Logge ta première séance pour voir tes statistiques ici.
              </ThemedText>
            </Card>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}
