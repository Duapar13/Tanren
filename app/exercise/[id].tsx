import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
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
  startOpacity: 0.3,
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
          <Card variant="accent" style={{ gap: Spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
              <Ionicons name="trophy" size={18} color={colors.accent} />
              <ThemedText variant="headline">{t.exerciseDetail.records}</ThemedText>
            </View>
            {[
              { label: t.exerciseDetail.maxWeight, value: formatWeight(pr.maxWeightKg, weightUnit), date: pr.maxWeightDate },
              { label: t.exerciseDetail.estimated1RM, value: formatWeight(pr.bestEstimated1RM, weightUnit), date: pr.bestEstimated1RMDate },
              { label: t.exerciseDetail.sessionVolume, value: formatWeight(pr.maxSessionVolume, weightUnit, 0), date: pr.maxSessionVolumeDate },
            ].map((row) => (
              <View key={row.label} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md }}>
                <View style={{ flex: 1 }}>
                  <ThemedText variant="subhead" weight="600">
                    {row.label}
                  </ThemedText>
                  <ThemedText variant="caption" color="tertiary">
                    {row.date}
                  </ThemedText>
                </View>
                <ThemedText variant="title3" weight="800" color="accent">
                  {row.value}
                </ThemedText>
              </View>
            ))}
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
