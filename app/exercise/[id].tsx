import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { LineChart } from 'react-native-gifted-charts';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { Card } from '../../components/Card';
import { SegmentedControl } from '../../components/SegmentedControl';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../hooks/useTranslation';
import { Spacing } from '../../constants/theme';
import { MUSCLE_GROUP_LABELS } from '../../types';
import { computeExerciseHistory, computeExercisePRs } from '../../utils/prStats';
import { formatWeight } from '../../utils/units';

const chartCommonProps = {
  height: 120,
  thickness: 2,
  hideRules: true,
  hideYAxisText: true,
  hideAxesAndRules: true,
  dataPointsRadius: 2,
  areaChart: true,
  startOpacity: 0.08,
  endOpacity: 0,
  xAxisColor: 'transparent',
  yAxisColor: 'transparent',
  initialSpacing: 8,
  disableScroll: true,
} as const;

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { exercises, sets, sessions } = useData();
  const { user } = useAuth();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [metric, setMetric] = useState<'weight' | '1rm'>('weight');
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
  const history = computeExerciseHistory(exercise.id, sets, sessions);

  return (
    <ThemedView variant="grouped" style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.lg }}>
        <View>
          <ThemedText variant="title1">{exercise.name}</ThemedText>
          <ThemedText color="secondary">
            {exercise.category === 'upper' ? t.common.upperBody : t.common.lowerBody} ·{' '}
            {MUSCLE_GROUP_LABELS[exercise.muscleGroup]}
          </ThemedText>
          {!!exercise.deletedAt && (
            <ThemedText variant="caption" color="tertiary" style={{ marginTop: Spacing.xs }}>
              {t.exerciseDetail.deletedNotice}
            </ThemedText>
          )}
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

        <Card style={{ gap: Spacing.md }}>
          <ThemedText variant="headline">{t.exerciseDetail.progressTitle}</ThemedText>
          {history.length >= 2 ? (
            <>
              <SegmentedControl
                options={[
                  { label: t.exerciseDetail.progressToggleWeight, value: 'weight' as const },
                  { label: t.exerciseDetail.progressToggle1RM, value: '1rm' as const },
                ]}
                value={metric}
                onChange={setMetric}
              />
              <LineChart
                data={history.map((p) => ({
                  value: metric === 'weight' ? p.maxWeightKg : p.bestEstimated1RM,
                }))}
                color={colors.accent}
                dataPointsColor={colors.accent}
                startFillColor={colors.accent}
                spacing={(320 - 16) / Math.max(history.length - 1, 1)}
                {...chartCommonProps}
              />
            </>
          ) : (
            <ThemedText color="secondary">{t.exerciseDetail.notEnoughData}</ThemedText>
          )}
        </Card>
      </ScrollView>
    </ThemedView>
  );
}
