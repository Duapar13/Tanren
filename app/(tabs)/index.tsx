import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '../../components/ScreenHeader';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { WeekStrip } from '../../components/WeekStrip';
import { Gyma } from '../../components/mascot/Gyma';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../hooks/useTranslation';
import { Radius, Spacing } from '../../constants/theme';
import { isTrainingDay } from '../../utils/program';
import { todayKey } from '../../utils/date';
import { loadActiveDraft } from '../../utils/sessionDraft';
import { formatWeight } from '../../utils/units';
import { openSession } from '../../lib/startSession';

export default function DashboardScreen() {
  const { sessions, sets, exercises, workoutTemplates } = useData();
  const { user } = useAuth();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const weightUnit = user?.weightUnit ?? 'kg';

  const trainingDays = user?.trainingDays ?? [];
  const isRestToday = !isTrainingDay(new Date(), trainingDays);
  const today = todayKey();

  const todaysSessions = useMemo(() => sessions.filter((s) => s.date === today), [sessions, today]);
  const doneToday = todaysSessions.length > 0;
  const todaysSets = useMemo(() => {
    const ids = new Set(todaysSessions.map((s) => s.id));
    return sets.filter((s) => ids.has(s.sessionId));
  }, [sets, todaysSessions]);
  const todaysVolumeKg = todaysSets.reduce((sum, s) => sum + s.weightKg * s.reps, 0);

  // A draft means a workout was started and not finished (app closed mid-session, etc.).
  const [hasDraft, setHasDraft] = useState(false);
  useFocusEffect(
    useCallback(() => {
      loadActiveDraft().then((draft) => setHasDraft(!!draft && draft.activeExerciseIds.length > 0));
    }, [today])
  );

  const firstName = (user?.displayName ?? user?.username ?? '').split(' ')[0];
  const quiet = isRestToday && !doneToday && !hasDraft;

  const heroEyebrow = t.dashboard.today;
  let heroTitle: string = t.dashboard.trainingDay;
  let heroIcon: keyof typeof Ionicons.glyphMap = 'flame';
  if (hasDraft) {
    heroTitle = t.dashboard.resume;
  } else if (doneToday) {
    heroTitle = t.dashboard.doneToday;
    heroIcon = 'checkmark-circle';
  } else if (isRestToday) {
    heroTitle = t.dashboard.restDay;
    heroIcon = 'moon';
  }

  // Gyma mirrors the state of the day: ready, resting, mid-workout, or done.
  const gymaPose = hasDraft ? 'lift' : doneToday ? 'victory' : isRestToday ? 'rest' : 'idle';
  const gymaReaction = hasDraft ? 'focused' : doneToday ? 'happy' : isRestToday ? 'sleepy' : 'excited';

  return (
    <ThemedView variant="grouped" style={{ flex: 1 }}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScreenHeader title={t.dashboard.greeting(firstName)} mascot="default" />
        <ScrollView
          contentContainerStyle={{
            padding: Spacing.lg,
            gap: Spacing.xl,
            paddingBottom: Spacing.xxl * 3,
          }}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInDown.duration(420)}>
          <Card variant={quiet ? 'default' : 'accent'} style={{ gap: Spacing.lg, paddingVertical: Spacing.xl }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
              <View style={{ flex: 1, gap: Spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
              <Ionicons
                name={heroIcon}
                size={18}
                color={doneToday ? colors.positive : quiet ? colors.textSecondary : colors.accent}
              />
              <ThemedText variant="footnote" weight="700" color="secondary" style={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>
                {heroEyebrow}
              </ThemedText>
              </View>
              <ThemedText variant="title1">{heroTitle}</ThemedText>
              </View>
              <Gyma pose={gymaPose} reaction={gymaReaction} size={92} animated interactive />
            </View>

            <View style={{ gap: 4 }}>
              {doneToday && !hasDraft && (
                <ThemedText variant="subhead" color="secondary">
                  {t.dashboard.doneBody(todaysSets.length, formatWeight(todaysVolumeKg, weightUnit, 0))}
                </ThemedText>
              )}
              {quiet && (
                <ThemedText variant="subhead" color="secondary">
                  {t.dashboard.restBody}
                </ThemedText>
              )}
            </View>

            {hasDraft ? (
              <Button title={t.dashboard.resume} onPress={() => openSession()} />
            ) : doneToday ? (
              <Button title={t.dashboard.addMore} variant="tonal" onPress={() => openSession()} />
            ) : isRestToday ? (
              <Button
                title={t.dashboard.trainAnyway}
                variant="tonal"
                onPress={() => openSession()}
              />
            ) : (
              <Button title={t.dashboard.startSession} onPress={() => openSession()} />
            )}
          </Card>
          </Animated.View>

          {workoutTemplates.length > 0 && !hasDraft && !doneToday && (
            <Animated.View entering={FadeInDown.delay(90).duration(420)} style={{ gap: Spacing.sm }}>
              <ThemedText variant="footnote" weight="700" color="secondary" style={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>
                {t.dashboard.chooseTemplate}
              </ThemedText>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: Spacing.sm }}
                style={{ marginHorizontal: -Spacing.lg }}
              >
                <View style={{ width: Spacing.lg - Spacing.sm }} />
                {workoutTemplates.map((tpl) => (
                  <Pressable
                    key={tpl.id}
                    onPress={() => openSession({ templateId: tpl.id })}
                    style={({ pressed }) => ({
                      paddingHorizontal: Spacing.lg,
                      paddingVertical: Spacing.md,
                      borderRadius: Radius.lg,
                      backgroundColor: colors.card,
                      borderWidth: 1,
                      borderColor: colors.border,
                      opacity: pressed ? 0.75 : 1,
                      gap: 2,
                    })}
                  >
                    <ThemedText variant="subhead" weight="800">
                      {tpl.name}
                    </ThemedText>
                    <ThemedText variant="caption" color="tertiary">
                      {t.seance.exerciseCount(tpl.exerciseIds.length)}
                    </ThemedText>
                  </Pressable>
                ))}
                <View style={{ width: Spacing.lg - Spacing.sm }} />
              </ScrollView>
            </Animated.View>
          )}

          <Animated.View entering={FadeInDown.delay(180).duration(420)}>
            <Card>
              <WeekStrip sessions={sessions} trainingDays={trainingDays} />
            </Card>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}
