import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LineChart } from 'react-native-gifted-charts';
import { ScreenHeader } from '../../components/ScreenHeader';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { Card } from '../../components/Card';
import { ChipSelector } from '../../components/ChipSelector';
import { SegmentedControl } from '../../components/SegmentedControl';
import { CalendarHeatmap } from '../../components/CalendarHeatmap';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../hooks/useTheme';
import { Spacing } from '../../constants/theme';
import { computeExerciseSeries } from '../../utils/exerciseSeries';
import { computeExercisePRs } from '../../utils/prStats';

type Metric = '1RM' | 'weight' | 'volume';

const METRIC_OPTIONS: { label: string; value: Metric }[] = [
  { label: '1RM est.', value: '1RM' },
  { label: 'Poids max', value: 'weight' },
  { label: 'Volume', value: 'volume' },
];

const CATEGORY_OPTIONS: { label: string; value: 'upper' | 'lower' }[] = [
  { label: 'Haut', value: 'upper' },
  { label: 'Bas', value: 'lower' },
];

export default function ProgressionScreen() {
  const { exercises, sets, sessions } = useData();
  const { user } = useAuth();
  const { colors } = useTheme();

  const [category, setCategory] = useState<'upper' | 'lower'>('upper');

  const exercisesWithData = useMemo(() => {
    const idsWithSets = new Set(sets.map((s) => s.exerciseId));
    return exercises.filter((e) => idsWithSets.has(e.id) && e.category === category);
  }, [exercises, sets, category]);

  const [selectedName, setSelectedName] = useState<string>('');
  const selectedExercise =
    exercisesWithData.find((e) => e.name === selectedName) ?? exercisesWithData[0];
  const [metric, setMetric] = useState<Metric>('1RM');

  const series = selectedExercise
    ? computeExerciseSeries(selectedExercise.id, sets, sessions)
    : [];

  const prs = computeExercisePRs(sets, sessions);
  const pr = selectedExercise ? prs.get(selectedExercise.id) : undefined;

  const chartData = series.map((p) => ({
    value: metric === '1RM' ? p.best1RM : metric === 'weight' ? p.maxWeightKg : p.volume,
  }));

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
          <View>
            <ThemedText variant="headline" style={{ marginBottom: Spacing.sm }}>
              Régularité
            </ThemedText>
            <Card>
              <CalendarHeatmap
                sessions={sessions}
                trainingDays={user?.trainingDays ?? []}
              />
            </Card>
          </View>

          <View>
            <ThemedText variant="headline" style={{ marginBottom: Spacing.sm }}>
              Exercice
            </ThemedText>
            <SegmentedControl
              options={CATEGORY_OPTIONS}
              value={category}
              onChange={(v) => {
                setCategory(v);
                setSelectedName('');
              }}
            />
          </View>

          {exercisesWithData.length === 0 ? (
            <Card>
              <ThemedText color="secondary" style={{ textAlign: 'center' }}>
                Logge des séries pour voir ta progression par exercice ici.
              </ThemedText>
            </Card>
          ) : (
            <>
              <View>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                    marginBottom: Spacing.sm,
                  }}
                >
                  {selectedExercise && (
                    <Pressable onPress={() => router.push(`/exercise/${selectedExercise.id}`)}>
                      <ThemedText variant="footnote" weight="600" color="accent">
                        Voir la fiche
                      </ThemedText>
                    </Pressable>
                  )}
                </View>
                <ChipSelector
                  options={exercisesWithData.map((e) => e.name)}
                  value={selectedExercise?.name ?? ''}
                  onChange={setSelectedName}
                />
              </View>

              <Card style={{ gap: Spacing.md }}>
                <SegmentedControl options={METRIC_OPTIONS} value={metric} onChange={setMetric} />
                {chartData.length >= 2 ? (
                  <LineChart
                    data={chartData}
                    height={140}
                    thickness={2}
                    color={colors.accent}
                    hideRules
                    hideYAxisText
                    hideAxesAndRules
                    dataPointsColor={colors.accent}
                    dataPointsRadius={3}
                    areaChart
                    startFillColor={colors.accent}
                    startOpacity={0.08}
                    endOpacity={0}
                    xAxisColor="transparent"
                    yAxisColor="transparent"
                    initialSpacing={8}
                    spacing={(320 - 16) / Math.max(chartData.length - 1, 1)}
                    disableScroll
                  />
                ) : (
                  <ThemedText color="tertiary" style={{ textAlign: 'center', paddingVertical: Spacing.lg }}>
                    Pas encore assez de séances pour un graphique.
                  </ThemedText>
                )}
              </Card>

              {pr && (
                <View>
                  <ThemedText variant="headline" style={{ marginBottom: Spacing.sm }}>
                    Records personnels
                  </ThemedText>
                  <Card style={{ gap: Spacing.sm }}>
                    <PRRow label="Poids max" value={`${pr.maxWeightKg} kg`} date={pr.maxWeightDate} />
                    <PRRow
                      label="1RM estimée"
                      value={`${pr.bestEstimated1RM.toFixed(1)} kg`}
                      date={pr.bestEstimated1RMDate}
                    />
                    <PRRow
                      label="Volume (1 séance)"
                      value={`${pr.maxSessionVolume.toFixed(0)} kg`}
                      date={pr.maxSessionVolumeDate}
                    />
                  </Card>
                </View>
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function PRRow({ label, value, date }: { label: string; value: string; date: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <ThemedText variant="subhead" color="secondary">
        {label}
      </ThemedText>
      <ThemedText variant="subhead" weight="600">
        {value} <ThemedText variant="caption" color="tertiary">· {date}</ThemedText>
      </ThemedText>
    </View>
  );
}
