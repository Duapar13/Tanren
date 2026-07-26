import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ScreenHeader } from '../../components/ScreenHeader';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { SegmentedControl } from '../../components/SegmentedControl';
import { ChipSelector } from '../../components/ChipSelector';
import { ExerciseSetLogger, DraftSet } from '../../components/ExerciseSetLogger';
import { useData } from '../../context/DataContext';
import { Spacing } from '../../constants/theme';
import { SessionCategory } from '../../types';
import { getSplitDayType } from '../../utils/program';
import { todayKey } from '../../utils/date';

const CATEGORY_OPTIONS: { label: string; value: SessionCategory }[] = [
  { label: 'Haut', value: 'upper' },
  { label: 'Bas', value: 'lower' },
  { label: 'Perso', value: 'custom' },
];

export default function SeanceScreen() {
  const { exercises, addSession } = useData();

  const suggestedCategory: SessionCategory = useMemo(() => {
    const split = getSplitDayType(new Date());
    return split === 'rest' ? 'custom' : split;
  }, []);

  const [category, setCategory] = useState<SessionCategory>(suggestedCategory);
  const [activeExerciseIds, setActiveExerciseIds] = useState<number[]>([]);
  const [draftSets, setDraftSets] = useState<Record<number, DraftSet[]>>({});
  const [showAllExercises, setShowAllExercises] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const availableExercises = useMemo(() => {
    if (showAllExercises || category === 'custom') return exercises;
    return exercises.filter((e) => e.category === category);
  }, [exercises, category, showAllExercises]);

  const pickableExercises = availableExercises.filter(
    (e) => !activeExerciseIds.includes(e.id)
  );

  const addExercise = (exerciseId: number) => {
    setActiveExerciseIds((ids) => [...ids, exerciseId]);
  };

  const removeExercise = (exerciseId: number) => {
    setActiveExerciseIds((ids) => ids.filter((id) => id !== exerciseId));
    setDraftSets((prev) => {
      const next = { ...prev };
      delete next[exerciseId];
      return next;
    });
  };

  const addSet = (exerciseId: number, set: DraftSet) => {
    setDraftSets((prev) => ({
      ...prev,
      [exerciseId]: [...(prev[exerciseId] ?? []), set],
    }));
  };

  const removeSet = (exerciseId: number, index: number) => {
    setDraftSets((prev) => ({
      ...prev,
      [exerciseId]: (prev[exerciseId] ?? []).filter((_, i) => i !== index),
    }));
  };

  const totalSets = Object.values(draftSets).reduce((sum, s) => sum + s.length, 0);

  const handleFinish = async () => {
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
      await addSession({ date: todayKey(), category, notes: '' }, setInputs);
      setActiveExerciseIds([]);
      setDraftSets({});
      router.push('/(tabs)');
    } finally {
      setSubmitting(false);
    }
  };

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
            <ThemedText variant="headline">Type de séance</ThemedText>
            <SegmentedControl
              options={CATEGORY_OPTIONS}
              value={category}
              onChange={setCategory}
            />
          </Card>

          <Card style={{ gap: Spacing.sm }}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <ThemedText variant="headline">Ajouter un exercice</ThemedText>
              <Button
                title={showAllExercises ? 'Filtré' : 'Toute la bibliothèque'}
                variant="plain"
                onPress={() => setShowAllExercises((v) => !v)}
              />
            </View>
            <ChipSelector
              options={pickableExercises.map((e) => e.name)}
              value=""
              onChange={(name) => {
                const ex = pickableExercises.find((e) => e.name === name);
                if (ex) addExercise(ex.id);
              }}
            />
          </Card>

          {activeExerciseIds.map((exerciseId) => {
            const exercise = exercises.find((e) => e.id === exerciseId);
            if (!exercise) return null;
            return (
              <ExerciseSetLogger
                key={exerciseId}
                exercise={exercise}
                draftSets={draftSets[exerciseId] ?? []}
                onAddSet={(set) => addSet(exerciseId, set)}
                onRemoveSet={(i) => removeSet(exerciseId, i)}
                onRemoveExercise={() => removeExercise(exerciseId)}
              />
            );
          })}

          <Button
            title={submitting ? 'Enregistrement…' : 'Terminer la séance'}
            onPress={handleFinish}
            disabled={submitting || totalSets === 0}
            style={{ opacity: totalSets === 0 ? 0.4 : 1 }}
          />
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}
