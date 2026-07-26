import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LineChart } from 'react-native-gifted-charts';
import { ScreenHeader } from '../../components/ScreenHeader';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { Card } from '../../components/Card';
import { ProgressBar } from '../../components/ProgressBar';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { SegmentedControl } from '../../components/SegmentedControl';
import { useData } from '../../context/DataContext';
import { useTheme } from '../../hooks/useTheme';
import { Spacing } from '../../constants/theme';
import { proteinTargetGrams } from '../../utils/nutrition';
import {
  bodyWeightSeries,
  latestBodyWeight,
  proteinDailySeries,
  proteinTotalForDate,
} from '../../utils/nutritionStats';
import { todayKey } from '../../utils/date';

type RangeDays = 7 | 30 | 90;
const RANGE_OPTIONS: { label: string; value: string }[] = [
  { label: '7j', value: '7' },
  { label: '30j', value: '30' },
  { label: '90j', value: '90' },
];

export default function NutritionScreen() {
  const { bodyWeightEntries, proteinEntries, addBodyWeightEntry, addProteinEntry } =
    useData();
  const { colors } = useTheme();

  const [proteinInput, setProteinInput] = useState('');
  const [weightInput, setWeightInput] = useState('');
  const [proteinRange, setProteinRange] = useState<string>('7');

  const currentWeight = latestBodyWeight(bodyWeightEntries);
  const target = currentWeight ? proteinTargetGrams(currentWeight) : null;
  const todayProtein = proteinTotalForDate(proteinEntries, todayKey());

  const proteinSeries = proteinDailySeries(proteinEntries, Number(proteinRange) as RangeDays);
  const weightSeries = bodyWeightSeries(bodyWeightEntries, 90);

  const num = (v: string) => {
    const n = parseFloat(v.replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  };

  const handleAddProtein = async () => {
    const grams = num(proteinInput);
    if (grams <= 0) return;
    await addProteinEntry({ date: todayKey(), grams });
    setProteinInput('');
  };

  const handleAddWeight = async () => {
    const weightKg = num(weightInput);
    if (weightKg <= 0) return;
    await addBodyWeightEntry({ date: todayKey(), weightKg });
    setWeightInput('');
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
          <View>
            <ThemedText variant="headline" style={{ marginBottom: Spacing.sm }}>
              Protéines aujourd’hui
            </ThemedText>
            <Card style={{ gap: Spacing.md }}>
              {target ? (
                <>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <ThemedText variant="title2" weight="700">
                      {todayProtein.toFixed(0)} g
                    </ThemedText>
                    <ThemedText variant="subhead" color="secondary">
                      Objectif : {target.toFixed(0)} g
                    </ThemedText>
                  </View>
                  <ProgressBar progress={todayProtein / target} />
                </>
              ) : (
                <ThemedText color="secondary">
                  Ajoute ton poids de corps ci-dessous pour calculer ton objectif
                  (poids × 1,8 g).
                </ThemedText>
              )}
              <View style={{ flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-end' }}>
                <View style={{ flex: 1 }}>
                  <ThemedText variant="caption" color="tertiary">
                    Grammes consommés
                  </ThemedText>
                  <Input
                    keyboardType="decimal-pad"
                    value={proteinInput}
                    onChangeText={setProteinInput}
                    placeholder="0"
                  />
                </View>
                <Button title="Ajouter" onPress={handleAddProtein} style={{ paddingHorizontal: Spacing.lg }} />
              </View>
            </Card>
          </View>

          <View>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: Spacing.sm,
              }}
            >
              <ThemedText variant="headline">Évolution protéines</ThemedText>
              <SegmentedControl
                options={RANGE_OPTIONS}
                value={proteinRange}
                onChange={setProteinRange}
              />
            </View>
            <Card>
              {proteinSeries.some((p) => p.value > 0) ? (
                <LineChart
                  data={proteinSeries.map((p) => ({ value: p.value }))}
                  height={120}
                  thickness={2}
                  color={colors.accent}
                  hideRules
                  hideYAxisText
                  hideAxesAndRules
                  dataPointsColor={colors.accent}
                  dataPointsRadius={2}
                  areaChart
                  startFillColor={colors.accent}
                  startOpacity={0.08}
                  endOpacity={0}
                  xAxisColor="transparent"
                  yAxisColor="transparent"
                  initialSpacing={8}
                  spacing={(320 - 16) / Math.max(proteinSeries.length - 1, 1)}
                  disableScroll
                />
              ) : (
                <ThemedText color="tertiary" style={{ textAlign: 'center', paddingVertical: Spacing.lg }}>
                  Aucune donnée sur cette période.
                </ThemedText>
              )}
            </Card>
          </View>

          <View>
            <ThemedText variant="headline" style={{ marginBottom: Spacing.sm }}>
              Poids de corps
            </ThemedText>
            <Card style={{ gap: Spacing.md }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <ThemedText variant="title2" weight="700">
                  {currentWeight ? `${currentWeight} kg` : '—'}
                </ThemedText>
                <ThemedText variant="footnote" color="secondary">
                  Dernière pesée
                </ThemedText>
              </View>
              {weightSeries.length >= 2 && (
                <LineChart
                  data={weightSeries.map((p) => ({ value: p.value }))}
                  height={120}
                  thickness={2}
                  color={colors.accent}
                  hideRules
                  hideYAxisText
                  hideAxesAndRules
                  dataPointsColor={colors.accent}
                  dataPointsRadius={2}
                  areaChart
                  startFillColor={colors.accent}
                  startOpacity={0.08}
                  endOpacity={0}
                  xAxisColor="transparent"
                  yAxisColor="transparent"
                  initialSpacing={8}
                  spacing={(320 - 16) / Math.max(weightSeries.length - 1, 1)}
                  disableScroll
                />
              )}
              <View style={{ flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-end' }}>
                <View style={{ flex: 1 }}>
                  <ThemedText variant="caption" color="tertiary">
                    Poids (kg)
                  </ThemedText>
                  <Input
                    keyboardType="decimal-pad"
                    value={weightInput}
                    onChangeText={setWeightInput}
                    placeholder="0"
                  />
                </View>
                <Button title="Ajouter" onPress={handleAddWeight} style={{ paddingHorizontal: Spacing.lg }} />
              </View>
            </Card>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}
