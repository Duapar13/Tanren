import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
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
import { LOCALE_MAP, useTranslation } from '../../hooks/useTranslation';
import { Radius, Spacing } from '../../constants/theme';
import { isTrainingDay } from '../../utils/program';
import { formatLongDate, todayKey } from '../../utils/date';
import { loadSessionDraft } from '../../utils/sessionDraft';
import { suggestSession } from '../../utils/sessionSuggestion';
import { formatWeight } from '../../utils/units';
import { openSession } from '../../lib/startSession';

const PREVIEW_EXERCISES = 4;

export default function DashboardScreen() {
  const { sessions, sets, exercises, workoutTemplates } = useData();
  const { user } = useAuth();
  const { colors } = useTheme();
  const { t, lang } = useTranslation();
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

  const suggestion = useMemo(() => suggestSession(sessions, sets, exercises), [sessions, sets, exercises]);
  const plannedExercises = suggestion.exerciseIds
    .map((id) => exercises.find((e) => e.id === id))
    .filter((e): e is NonNullable<typeof e> => !!e);

  // A draft means a workout was started and not finished (app closed mid-session, etc.).
  const [hasDraft, setHasDraft] = useState(false);
  useFocusEffect(
    useCallback(() => {
      loadSessionDraft(today).then((draft) => setHasDraft(!!draft && draft.activeExerciseIds.length > 0));
    }, [today])
  );

  const firstName = (user?.displayName ?? user?.username ?? '').split(' ')[0];
  const categoryLabel = suggestion.category === 'upper' ? t.dashboard.upper : t.dashboard.lower;
  const quiet = isRestToday && !doneToday && !hasDraft;

  let heroEyebrow = t.dashboard.suggested;
  let heroTitle = categoryLabel;
  let heroIcon: keyof typeof Ionicons.glyphMap = 'flame';
  if (hasDraft) {
    heroEyebrow = t.dashboard.today;
    heroTitle = t.dashboard.resume;
  } else if (doneToday) {
    heroEyebrow = t.dashboard.today;
    heroTitle = t.dashboard.doneToday;
    heroIcon = 'checkmark-circle';
  } else if (isRestToday) {
    heroEyebrow = t.dashboard.today;
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
              <Gyma pose={gymaPose} reaction={gymaReaction} size={92} animated />
            </View>

            <View style={{ gap: 4 }}>
              {!hasDraft && !doneToday && !isRestToday && suggestion.basedOnDate && (
                <ThemedText variant="subhead" color="secondary">
                  {t.dashboard.basedOn(formatLongDate(suggestion.basedOnDate, LOCALE_MAP[lang]))}
                </ThemedText>
              )}
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

            {!hasDraft && !doneToday && !isRestToday && (
              <View style={{ gap: Spacing.sm }}>
                {plannedExercises.length === 0 ? (
                  <ThemedText variant="subhead" color="secondary">
                    {t.dashboard.freeHint}
                  </ThemedText>
                ) : (
                  <>
                    {plannedExercises.slice(0, PREVIEW_EXERCISES).map((e, i) => (
                      <View key={e.id} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
                        <View
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: 12,
                            backgroundColor: colors.accent + '26',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <ThemedText variant="caption" weight="800" color="accent">
                            {i + 1}
                          </ThemedText>
                        </View>
                        <ThemedText variant="subhead" weight="600" numberOfLines={1} style={{ flex: 1 }}>
                          {e.name}
                        </ThemedText>
                      </View>
                    ))}
                    {plannedExercises.length > PREVIEW_EXERCISES && (
                      <ThemedText variant="footnote" color="tertiary" style={{ marginLeft: 36 }}>
                        {t.dashboard.more(plannedExercises.length - PREVIEW_EXERCISES)}
                      </ThemedText>
                    )}
                  </>
                )}
              </View>
            )}

            {hasDraft ? (
              <Button title={t.dashboard.resume} onPress={() => openSession()} />
            ) : doneToday ? (
              <Button title={t.dashboard.addMore} variant="tonal" onPress={() => openSession()} />
            ) : isRestToday ? (
              <Button
                title={t.dashboard.trainAnyway}
                variant="tonal"
                onPress={() => openSession({ exerciseIds: suggestion.exerciseIds })}
              />
            ) : (
              <Button title={t.dashboard.launch} onPress={() => openSession({ exerciseIds: suggestion.exerciseIds })} />
            )}
          </Card>

          {workoutTemplates.length > 0 && !hasDraft && !doneToday && (
            <View style={{ gap: Spacing.sm }}>
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
            </View>
          )}

          <Card>
            <WeekStrip sessions={sessions} trainingDays={trainingDays} />
          </Card>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}
