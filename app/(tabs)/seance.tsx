import { useMemo, useState } from 'react';
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
import { Spacing } from '../../constants/theme';
import { todayKey } from '../../utils/date';

const EXERCISE_FILTER_OPTIONS: { label: string; value: 'all' | 'upper' | 'lower' }[] = [
  { label: 'Tout', value: 'all' },
  { label: 'Haut', value: 'upper' },
  { label: 'Bas', value: 'lower' },
];

export default function SeanceScreen() {
  const { exercises, sessions, addSession, addSetsToSession, addExercise: createExercise } = useData();
  const { user } = useAuth();
  const { colors } = useTheme();

  const todaysSessions = useMemo(
    () => sessions.filter((s) => s.date === todayKey()),
    [sessions]
  );
  const resumeTarget = todaysSessions[0] ?? null;
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

  const availableExercises = useMemo(() => {
    if (exerciseFilter === 'all') return exercises;
    return exercises.filter((e) => e.category === exerciseFilter);
  }, [exercises, exerciseFilter]);

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
      setRestTimerEndAt(Date.now() + user.restTimerSeconds * 1000);
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
        await addSession({ date: todayKey(), category: 'custom', notes: '' }, setInputs);
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
        'Ajouter à la séance ?',
        `${totalSets} série${totalSets > 1 ? 's' : ''} de plus.`,
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Ajouter', onPress: commitSession },
        ]
      );
      return;
    }
    Alert.alert(
      'Terminer la séance ?',
      `${totalSets} série${totalSets > 1 ? 's' : ''} enregistrée${totalSets > 1 ? 's' : ''}.`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Terminer', onPress: commitSession },
      ]
    );
  };

  if (!showBuilder) {
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
            <TodaySessionsReview />
            <Button
              title="Ajouter un exercice oublié"
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
        <ScreenHeader />
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable style={{ flex: 1 }} onPress={Keyboard.dismiss}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{
                padding: Spacing.lg,
                gap: Spacing.lg,
                paddingBottom: Spacing.xxl,
              }}
            >
              {resumeTarget && resuming ? (
                <TodaySessionsReview />
              ) : null}

              {restTimerEndAt && (
                <RestTimerBanner endAt={restTimerEndAt} onDone={() => setRestTimerEndAt(null)} />
              )}

              {resumeTarget && resuming && (
                <Card style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View>
                    <ThemedText variant="caption" color="tertiary">
                      Ajout à la séance
                    </ThemedText>
                    <ThemedText variant="headline">Séance d’aujourd’hui</ThemedText>
                  </View>
                  <Button
                    title="Annuler"
                    variant="plain"
                    onPress={() => {
                      resetBuilder();
                      setResuming(false);
                    }}
                  />
                </Card>
              )}

              <Card style={{ gap: Spacing.sm }}>
                <ThemedText variant="headline">Ajouter un exercice</ThemedText>
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
                      placeholder="Nom du nouvel exercice"
                      value={newExerciseName}
                      onChangeText={setNewExerciseName}
                      returnKeyType="done"
                      onSubmitEditing={Keyboard.dismiss}
                    />
                    <SegmentedControl
                      options={[
                        { label: 'Haut du corps', value: 'upper' as const },
                        { label: 'Bas du corps', value: 'lower' as const },
                      ]}
                      value={newExerciseCategory}
                      onChange={setNewExerciseCategory}
                    />
                    <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                      <Button
                        title="Créer et ajouter"
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
                      Nouvel exercice
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
                    onToggleValidated={() => toggleValidated(exerciseId)}
                    onAddSet={(set) => addSet(exerciseId, set)}
                    onEditSet={(i, set) => editSet(exerciseId, i, set)}
                    onRemoveSet={(i) => removeSet(exerciseId, i)}
                    onRemoveExercise={() => removeExercise(exerciseId)}
                  />
                );
              })}

              <Button
                title={
                  submitting
                    ? 'Enregistrement…'
                    : resumeTarget && resuming
                      ? 'Ajouter à la séance'
                      : 'Terminer la séance'
                }
                onPress={handleFinish}
                disabled={submitting || totalSets === 0}
              />
            </ScrollView>
          </Pressable>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}
