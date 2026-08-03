import { ScrollView, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { Card } from '../../components/Card';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../hooks/useTranslation';
import { Spacing } from '../../constants/theme';
import { MUSCLE_GROUP_LABELS } from '../../types';
import { computeExercisePRs } from '../../utils/prStats';
import { formatWeight } from '../../utils/units';

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { exercises, sets, sessions } = useData();
  const { user } = useAuth();
  const { t } = useTranslation();
  const weightUnit = user?.weightUnit ?? 'kg';
  const exercise = exercises.find((e) => e.id === Number(id));

  if (!exercise) {
    return (
      <ThemedView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ThemedText color="secondary">{t.exerciseDetail.notFound}</ThemedText>
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
            {exercise.category === 'upper' ? t.common.upperBody : t.common.lowerBody} ·{' '}
            {MUSCLE_GROUP_LABELS[exercise.muscleGroup]}
          </ThemedText>
        </View>

        {pr && (
          <Card style={{ gap: Spacing.xs }}>
            <ThemedText variant="headline">{t.exerciseDetail.records}</ThemedText>
            <ThemedText color="secondary">
              {t.exerciseDetail.maxWeight} {formatWeight(pr.maxWeightKg, weightUnit)} ({pr.maxWeightDate})
            </ThemedText>
            <ThemedText color="secondary">
              {t.exerciseDetail.estimated1RM} {formatWeight(pr.bestEstimated1RM, weightUnit)} ({pr.bestEstimated1RMDate})
            </ThemedText>
            <ThemedText color="secondary">
              {t.exerciseDetail.sessionVolume} {formatWeight(pr.maxSessionVolume, weightUnit, 0)} (
              {pr.maxSessionVolumeDate})
            </ThemedText>
          </Card>
        )}
      </ScrollView>
    </ThemedView>
  );
}
