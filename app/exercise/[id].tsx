import { ScrollView, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { Card } from '../../components/Card';
import { useData } from '../../context/DataContext';
import { Spacing } from '../../constants/theme';
import { MUSCLE_GROUP_LABELS } from '../../types';
import { computeExercisePRs } from '../../utils/prStats';

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { exercises, sets, sessions, profile } = useData();
  const exercise = exercises.find((e) => e.id === Number(id));

  if (!exercise) {
    return (
      <ThemedView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ThemedText color="secondary">Exercice introuvable.</ThemedText>
      </ThemedView>
    );
  }

  const pr = computeExercisePRs(sets, sessions).get(exercise.id);

  return (
    <ThemedView variant="grouped" style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.lg }}>
        <View>
          <ThemedText variant="title1">{exercise.name}</ThemedText>
          <ThemedText color="secondary">
            {exercise.category === 'upper' ? 'Haut du corps' : 'Bas du corps'} ·{' '}
            {MUSCLE_GROUP_LABELS[exercise.muscleGroup]}
          </ThemedText>
        </View>

        {pr && (
          <Card style={{ gap: Spacing.xs }}>
            <ThemedText variant="headline">Records</ThemedText>
            <ThemedText color="secondary">
              Poids max : {pr.maxWeightKg} kg ({pr.maxWeightDate})
            </ThemedText>
            <ThemedText color="secondary">
              1RM estimée : {pr.bestEstimated1RM.toFixed(1)} kg ({pr.bestEstimated1RMDate})
            </ThemedText>
            <ThemedText color="secondary">
              Volume max (1 séance) : {pr.maxSessionVolume.toFixed(0)} kg (
              {pr.maxSessionVolumeDate})
            </ThemedText>
          </Card>
        )}

        {profile.tier >= 2 && (
          <Card style={{ gap: Spacing.xs }}>
            <ThemedText variant="headline">Anatomic-mapping</ThemedText>
            <ThemedText color="secondary">
              Groupe musculaire principal : {MUSCLE_GROUP_LABELS[exercise.muscleGroup]}.
              Surveille exécution, tempo et temps de récupération sur cet exercice.
            </ThemedText>
          </Card>
        )}

        {profile.tier >= 4 && (
          <Card style={{ gap: Spacing.xs }}>
            <ThemedText variant="headline">Biomécanique (Pro / Maître)</ThemedText>
            <ThemedText color="tertiary">
              Courbe de résistance, courbe de force sur l’amplitude, et classification
              tension d’étirement vs tension de contraction — à venir pour cet exercice.
            </ThemedText>
          </Card>
        )}
      </ScrollView>
    </ThemedView>
  );
}
