import { useEffect, useMemo, useState } from 'react';
import { Alert, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '../../components/ScreenHeader';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { IconButton } from '../../components/IconButton';
import { SegmentedControl } from '../../components/SegmentedControl';
import { ChipSelector } from '../../components/ChipSelector';
import { useTheme } from '../../hooks/useTheme';
import { ExerciseSetLogger, DraftSet } from '../../components/ExerciseSetLogger';
import { RestTimerBanner } from '../../components/RestTimerBanner';
import { TodaySessionsReview } from '../../components/TodaySessionsReview';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { LOCALE_MAP, useTranslation } from '../../hooks/useTranslation';
import { Spacing, Radius } from '../../constants/theme';
import { addDays, formatLongDate, todayKey, toDateKey } from '../../utils/date';
import { computeExercisePRs } from '../../utils/prStats';
import { clearSessionDraft, loadSessionDraft, saveSessionDraft } from '../../utils/sessionDraft';

export default function SeanceScreen() {
  const { exercises, sessions, sets, addSession, addSetsToSession, addExercise: createExercise, workoutTemplates, addWorkoutTemplate } = useData();
  const { user } = useAuth();
  const { colors } = useTheme();
  const { t, lang } = useTranslation();
  const locale = LOCALE_MAP[lang];

  const EXERCISE_FILTER_OPTIONS: { label: string; value: 'all' | 'upper' | 'lower' }[] = [
    { label: t.seance.all, value: 'all' },
    { label: t.seance.upperShort, value: 'upper' },
    { label: t.seance.lowerShort, value: 'lower' },
  ];

  const [selectedDate, setSelectedDate] = useState(todayKey());
  const isToday = selectedDate === todayKey();
  const dateLabel = isToday ? t.dashboard.today : formatLongDate(selectedDate, locale);
  const shiftSelectedDate = (deltaDays: number) => {
    setSelectedDate((current) => {
      const next = toDateKey(addDays(new Date(`${current}T00:00:00`), deltaDays));
      return next > todayKey() ? current : next;
    });
  };

  const sessionsForSelectedDate = useMemo(
    () => sessions.filter((s) => s.date === selectedDate),
    [sessions, selectedDate]
  );
  const resumeTarget = sessionsForSelectedDate[0] ?? null;
  const [resuming, setResuming] = useState(false);
  const showBuilder = !resumeTarget || resuming;

  const [exerciseFilter, setExerciseFilter] = useState<'all' | 'upper' | 'lower'>('all');

  const [activeExerciseIds, setActiveExerciseIds] = useState<number[]>([]);
  const [draftSets, setDraftSets] = useState<Record<number, DraftSet[]>>({});
  const [validatedExerciseIds, setValidatedExerciseIds] = useState<Set<number>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [restTimerEndAt, setRestTimerEndAt] = useState<number | null>(null);
  const [showCreateExercise, setShowCreateExercise] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState('');
  const [newExerciseCategory, setNewExerciseCategory] = useState<'upper' | 'lower'>('upper');
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');

  // Re-hydrates whenever selectedDate changes, not just on mount, so switching the date stepper
  // to a day with an in-progress draft restores it, and switching away from one starts clean
  // instead of bleeding the previous date's builder state into the new date.
  useEffect(() => {
    setDraftHydrated(false);
    loadSessionDraft(selectedDate).then((draft) => {
      if (draft && draft.activeExerciseIds.length > 0) {
        setActiveExerciseIds(draft.activeExerciseIds);
        setDraftSets(draft.draftSets);
        setValidatedExerciseIds(new Set(draft.validatedExerciseIds));
        setResuming(draft.resuming);
      } else {
        setActiveExerciseIds([]);
        setDraftSets({});
        setValidatedExerciseIds(new Set());
        setResuming(false);
      }
      setDraftHydrated(true);
    });
  }, [selectedDate]);

  useEffect(() => {
    if (!draftHydrated) return;
    if (activeExerciseIds.length === 0) {
      clearSessionDraft();
      return;
    }
    saveSessionDraft(selectedDate, {
      activeExerciseIds,
      draftSets,
      validatedExerciseIds: Array.from(validatedExerciseIds),
      resuming,
    });
  }, [draftHydrated, selectedDate, activeExerciseIds, draftSets, validatedExerciseIds, resuming]);

  const availableExercises = useMemo(() => {
    const active = exercises.filter((e) => !e.deletedAt);
    if (exerciseFilter === 'all') return active;
    return active.filter((e) => e.category === exerciseFilter);
  }, [exercises, exerciseFilter]);

  const exercisePRs = useMemo(() => computeExercisePRs(sets, sessions), [sets, sessions]);

  const pickableExercises = availableExercises.filter(
    (e) => !activeExerciseIds.includes(e.id)
  );

  const addExerciseToSession = (exerciseId: number) => {
    setActiveExerciseIds((ids) => [...ids, exerciseId]);
  };

  const handleCreateExercise = async () => {
    if (!newExerciseName.trim()) return;
    const newId = await createExercise({
      name: newExerciseName.trim(),
      category: newExerciseCategory,
      muscleGroup: newExerciseCategory === 'upper' ? 'pecs' : 'quadriceps',
      isCustom: true,
    });
    addExerciseToSession(newId);
    setNewExerciseName('');
    setShowCreateExercise(false);
  };

  const startFromTemplate = (templateId: number) => {
    const template = workoutTemplates.find((tpl) => tpl.id === templateId);
    if (!template) return;
    // Drop any exercise the template references that no longer resolves locally (deleted account
    // data edge case) rather than crashing the logger on a missing exercise further down.
    setActiveExerciseIds(template.exerciseIds.filter((id) => exercises.some((e) => e.id === id)));
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim() || activeExerciseIds.length === 0) return;
    await addWorkoutTemplate({ name: templateName.trim(), exerciseIds: activeExerciseIds });
    setTemplateName('');
    setShowSaveTemplate(false);
    Alert.alert(t.workoutTemplates.savedConfirmation);
  };

  const removeExercise = (exerciseId: number) => {
    setActiveExerciseIds((ids) => ids.filter((id) => id !== exerciseId));
    setDraftSets((prev) => {
      const next = { ...prev };
      delete next[exerciseId];
      return next;
    });
    setValidatedExerciseIds((prev) => {
      const next = new Set(prev);
      next.delete(exerciseId);
      return next;
    });
  };

  const toggleValidated = (exerciseId: number) => {
    setValidatedExerciseIds((prev) => {
      const next = new Set(prev);
      if (next.has(exerciseId)) next.delete(exerciseId);
      else next.add(exerciseId);
      return next;
    });
  };

  const addSet = (exerciseId: number, set: DraftSet) => {
    setDraftSets((prev) => ({
      ...prev,
      [exerciseId]: [...(prev[exerciseId] ?? []), set],
    }));
    if (user?.restTimerEnabled) {
      setRestTimerEndAt(
        user.restTimerMode === 'stopwatch' ? Date.now() : Date.now() + user.restTimerSeconds * 1000
      );
    }
  };

  const editSet = (exerciseId: number, index: number, set: DraftSet) => {
    setDraftSets((prev) => ({
      ...prev,
      [exerciseId]: (prev[exerciseId] ?? []).map((s, i) => (i === index ? set : s)),
    }));
  };

  const removeSet = (exerciseId: number, index: number) => {
    setDraftSets((prev) => ({
      ...prev,
      [exerciseId]: (prev[exerciseId] ?? []).filter((_, i) => i !== index),
    }));
  };

  const totalSets = Object.values(draftSets).reduce((sum, s) => sum + s.length, 0);

  const resetBuilder = () => {
    setActiveExerciseIds([]);
    setDraftSets({});
    setValidatedExerciseIds(new Set());
    setRestTimerEndAt(null);
    clearSessionDraft();
    setSelectedDate(todayKey());
  };

  const commitSession = async () => {
    setSubmitting(true);
    try {
      const setInputs = activeExerciseIds.flatMap((exerciseId) =>
        (draftSets[exerciseId] ?? []).map((s, i) => ({
          exerciseId,
          setNumber: i + 1,
          reps: s.reps,
          weightKg: s.weightKg,
          rpe: s.rpe,
        }))
      );

      if (resumeTarget && resuming) {
        await addSetsToSession(resumeTarget.id, setInputs);
        resetBuilder();
        setResuming(false);
      } else {
        await addSession({ date: selectedDate, category: 'custom', notes: '' }, setInputs);
        resetBuilder();
        router.push('/(tabs)');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinish = () => {
    Keyboard.dismiss();
    if (resumeTarget && resuming) {
      Alert.alert(
        t.seance.addToSessionConfirmTitle,
        t.seance.addToSessionConfirmBody(totalSets),
        [
          { text: t.common.cancel, style: 'cancel' },
          { text: t.common.add, onPress: commitSession },
        ]
      );
      return;
    }
    Alert.alert(
      t.seance.finishSessionConfirmTitle,
      t.seance.finishSessionConfirmBody(totalSets),
      [
        { text: t.common.cancel, style: 'cancel' },
        { text: t.seance.finishSession, onPress: commitSession },
      ]
    );
  };

  const dateStepper = (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.md }}>
      <IconButton name="chevron-back" onPress={() => shiftSelectedDate(-1)} />
      <ThemedText variant="headline">{dateLabel}</ThemedText>
      <IconButton name="chevron-forward" onPress={() => shiftSelectedDate(1)} disabled={isToday} />
    </View>
  );

  if (!showBuilder) {
    return (
      <ThemedView variant="grouped" style={{ flex: 1 }}>
        <SafeAreaView edges={['top']} style={{ flex: 1 }}>
          <ScreenHeader mascot="focused" />
          <ScrollView
            contentContainerStyle={{
              padding: Spacing.lg,
              gap: Spacing.lg,
              paddingBottom: Spacing.xxl,
            }}
          >
            {dateStepper}
            <TodaySessionsReview date={selectedDate} title={dateLabel} />
            <Button
              title={t.seance.addForgottenExercise}
              variant="plain"
              onPress={() => setResuming(true)}
            />
          </ScrollView>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView variant="grouped" style={{ flex: 1 }}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScreenHeader mascot="focused" />
        {restTimerEndAt && (
          <View style={{ paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm }}>
            <RestTimerBanner
            endAt={restTimerEndAt}
            mode={user?.restTimerMode ?? 'countdown'}
            onDone={() => setRestTimerEndAt(null)}
          />
          </View>
        )}
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            onScrollBeginDrag={Keyboard.dismiss}
            contentContainerStyle={{
              padding: Spacing.lg,
              gap: Spacing.lg,
              paddingBottom: Spacing.xxl,
            }}
          >
              {!resuming && dateStepper}

              {!resuming && activeExerciseIds.length === 0 && workoutTemplates.length > 0 && (
                <Card style={{ gap: Spacing.sm }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <ThemedText variant="headline">{t.workoutTemplates.startFromTemplate}</ThemedText>
                    <Pressable onPress={() => router.push('/workout-templates')}>
                      <ThemedText variant="caption" color="accent">
                        {t.workoutTemplates.manageTemplates}
                      </ThemedText>
                    </Pressable>
                  </View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 8 }}
                  >
                    {workoutTemplates.map((tpl) => (
                      <Pressable
                        key={tpl.id}
                        onPress={() => startFromTemplate(tpl.id)}
                        style={{
                          paddingHorizontal: 14,
                          paddingVertical: 8,
                          borderRadius: Radius.pill,
                          backgroundColor: colors.fill,
                        }}
                      >
                        <ThemedText variant="subhead" weight="600">
                          {tpl.name}
                        </ThemedText>
                      </Pressable>
                    ))}
                  </ScrollView>
                </Card>
              )}

              {resumeTarget && resuming ? (
                <TodaySessionsReview date={selectedDate} title={dateLabel} />
              ) : null}

              {resumeTarget && resuming && (
                <Card style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View>
                    <ThemedText variant="caption" color="tertiary">
                      {t.seance.addingToSession}
                    </ThemedText>
                    <ThemedText variant="headline">{t.seance.todaysSession}</ThemedText>
                  </View>
                  <Button
                    title={t.common.cancel}
                    variant="plain"
                    onPress={() => {
                      resetBuilder();
                      setResuming(false);
                    }}
                  />
                </Card>
              )}

              <Card style={{ gap: Spacing.sm }}>
                <ThemedText variant="headline">{t.seance.addExercise}</ThemedText>
                <SegmentedControl
                  options={EXERCISE_FILTER_OPTIONS}
                  value={exerciseFilter}
                  onChange={setExerciseFilter}
                />
                <ChipSelector
                  options={pickableExercises.map((e) => e.name)}
                  value=""
                  onChange={(name) => {
                    const ex = pickableExercises.find((e) => e.name === name);
                    if (ex) addExerciseToSession(ex.id);
                  }}
                />

                {showCreateExercise ? (
                  <View style={{ gap: Spacing.sm, marginTop: Spacing.xs }}>
                    <Input
                      placeholder={t.seance.newExerciseNamePlaceholder}
                      value={newExerciseName}
                      onChangeText={setNewExerciseName}
                      returnKeyType="done"
                      onSubmitEditing={Keyboard.dismiss}
                    />
                    <SegmentedControl
                      options={[
                        { label: t.common.upperBody, value: 'upper' as const },
                        { label: t.common.lowerBody, value: 'lower' as const },
                      ]}
                      value={newExerciseCategory}
                      onChange={setNewExerciseCategory}
                    />
                    <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                      <Button
                        title={t.seance.createAndAdd}
                        onPress={handleCreateExercise}
                        style={{ flex: 1 }}
                      />
                      <IconButton name="close" onPress={() => setShowCreateExercise(false)} />
                    </View>
                  </View>
                ) : (
                  <Pressable
                    onPress={() => setShowCreateExercise(true)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.xs }}
                  >
                    <Ionicons name="add-circle-outline" size={20} color={colors.accent} />
                    <ThemedText variant="subhead" weight="600" color="accent">
                      {t.seance.newExerciseName}
                    </ThemedText>
                  </Pressable>
                )}
              </Card>

              {activeExerciseIds.map((exerciseId) => {
                const exercise = exercises.find((e) => e.id === exerciseId);
                if (!exercise) return null;
                return (
                  <ExerciseSetLogger
                    key={exerciseId}
                    exercise={exercise}
                    draftSets={draftSets[exerciseId] ?? []}
                    validated={validatedExerciseIds.has(exerciseId)}
                    rpeEnabled={user?.rpeEnabled ?? false}
                    weightUnit={user?.weightUnit ?? 'kg'}
                    bestWeightKg={exercisePRs.get(exerciseId)?.maxWeightKg || null}
                    onToggleValidated={() => toggleValidated(exerciseId)}
                    onAddSet={(set) => addSet(exerciseId, set)}
                    onEditSet={(i, set) => editSet(exerciseId, i, set)}
                    onRemoveSet={(i) => removeSet(exerciseId, i)}
                    onRemoveExercise={() => removeExercise(exerciseId)}
                  />
                );
              })}

              {activeExerciseIds.length > 0 && (
                showSaveTemplate ? (
                  <Card style={{ gap: Spacing.sm }}>
                    <Input
                      placeholder={t.workoutTemplates.namePlaceholder}
                      value={templateName}
                      onChangeText={setTemplateName}
                      returnKeyType="done"
                      onSubmitEditing={Keyboard.dismiss}
                    />
                    <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                      <Button
                        title={t.workoutTemplates.createButton}
                        onPress={handleSaveTemplate}
                        disabled={!templateName.trim()}
                        style={{ flex: 1 }}
                      />
                      <IconButton name="close" onPress={() => { setShowSaveTemplate(false); setTemplateName(''); }} />
                    </View>
                  </Card>
                ) : (
                  <Button
                    title={t.workoutTemplates.saveAsTemplate}
                    variant="plain"
                    onPress={() => setShowSaveTemplate(true)}
                  />
                )
              )}

              <Button
                title={
                  submitting
                    ? t.common.saving
                    : resumeTarget && resuming
                      ? t.seance.addToSession
                      : t.seance.finishSession
                }
                onPress={handleFinish}
                disabled={submitting || totalSets === 0}
              />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}
