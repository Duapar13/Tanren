import { useEffect, useState } from 'react';
import { Keyboard, Pressable, ScrollView, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LineChart } from 'react-native-gifted-charts';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '../../components/ScreenHeader';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { Card } from '../../components/Card';
import { Section } from '../../components/Section';
import { ProgressBar } from '../../components/ProgressBar';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { IconButton } from '../../components/IconButton';
import { SegmentedControl } from '../../components/SegmentedControl';
import { ChipSelector } from '../../components/ChipSelector';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../hooks/useTranslation';
import { Radius, Spacing } from '../../constants/theme';
import { bmi, bmiCategory, effectiveMacroTargets, macroTargets } from '../../utils/nutrition';
import {
  bodyWeightSeries,
  latestBodyWeight,
  macroDailySeries,
  macroTotalsForDate,
} from '../../utils/nutritionStats';
import { todayKey } from '../../utils/date';
import { MEASUREMENT_TYPE_LABELS, MEASUREMENT_TYPES, MeasurementType, NutritionEntry } from '../../types';

type MacroKey = 'proteinG' | 'carbsG' | 'fatG';

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

const num = (v: string) => {
  const n = parseFloat(v.replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

const MEASUREMENT_TYPE_OPTIONS: { label: string; value: MeasurementType }[] = MEASUREMENT_TYPES.map((t) => ({
  label: MEASUREMENT_TYPE_LABELS[t],
  value: t,
}));

export default function NutritionScreen() {
  const {
    bodyWeightEntries,
    nutritionEntries,
    measurementEntries,
    addBodyWeightEntry,
    removeBodyWeightEntry,
    addNutritionEntry,
    updateNutritionEntry,
    removeNutritionEntry,
    addMeasurementEntry,
    removeMeasurementEntry,
  } = useData();
  const { user, updateProfile } = useAuth();
  const { colors } = useTheme();
  const { t } = useTranslation();

  const RANGE_OPTIONS: { label: string; value: string }[] = [
    { label: t.nutrition.rangeDays(7), value: '7' },
    { label: t.nutrition.rangeDays(30), value: '30' },
    { label: t.nutrition.rangeDays(90), value: '90' },
  ];
  const MACRO_OPTIONS: { label: string; value: MacroKey }[] = [
    { label: t.nutrition.protein, value: 'proteinG' },
    { label: t.nutrition.carbs, value: 'carbsG' },
    { label: t.nutrition.fat, value: 'fatG' },
  ];

  const [proteinInput, setProteinInput] = useState('');
  const [carbsInput, setCarbsInput] = useState('');
  const [fatInput, setFatInput] = useState('');
  const [weightInput, setWeightInput] = useState('');
  const [range, setRange] = useState<string>('7');
  const [macro, setMacro] = useState<MacroKey>('proteinG');
  const [measurementType, setMeasurementType] = useState<MeasurementType>('biceps');
  const [measurementInput, setMeasurementInput] = useState('');

  const [editingEntryId, setEditingEntryId] = useState<number | null>(null);
  const [editGrams, setEditGrams] = useState('');
  const [editProtein, setEditProtein] = useState('');
  const [editCarbs, setEditCarbs] = useState('');
  const [editFat, setEditFat] = useState('');

  const isCustomTargets =
    user?.customProteinG != null && user?.customCarbsG != null && user?.customFatG != null;
  const [customProteinInput, setCustomProteinInput] = useState('');
  const [customCarbsInput, setCustomCarbsInput] = useState('');
  const [customFatInput, setCustomFatInput] = useState('');
  useEffect(() => {
    setCustomProteinInput(user?.customProteinG != null ? String(user.customProteinG) : '');
    setCustomCarbsInput(user?.customCarbsG != null ? String(user.customCarbsG) : '');
    setCustomFatInput(user?.customFatG != null ? String(user.customFatG) : '');
  }, [user?.customProteinG, user?.customCarbsG, user?.customFatG]);

  const currentWeight = latestBodyWeight(bodyWeightEntries);
  const goal = user?.goal ?? 'maintain';
  const targets =
    isCustomTargets || currentWeight
      ? effectiveMacroTargets(
          {
            customProteinG: user?.customProteinG ?? null,
            customCarbsG: user?.customCarbsG ?? null,
            customFatG: user?.customFatG ?? null,
          },
          currentWeight ?? 0,
          goal
        )
      : null;
  const currentBmi = currentWeight && user?.heightCm ? bmi(currentWeight, user.heightCm) : null;

  const today = todayKey();
  const todayTotals = macroTotalsForDate(nutritionEntries, today);
  const todayEntries = nutritionEntries.filter((e) => e.date === today);
  const recentWeights = bodyWeightEntries.slice(0, 10);

  const measurementsForType = measurementEntries.filter((e) => e.type === measurementType);
  const latestMeasurement = measurementsForType[0] ?? null;
  const recentMeasurements = measurementsForType.slice(0, 10);

  const macroSeries = macroDailySeries(nutritionEntries, Number(range));
  const weightSeries = bodyWeightSeries(bodyWeightEntries, 90);

  const handleAddNutrition = async () => {
    const proteinG = num(proteinInput);
    const carbsG = num(carbsInput);
    const fatG = num(fatInput);
    if (proteinG <= 0 && carbsG <= 0 && fatG <= 0) return;
    await addNutritionEntry({
      date: todayKey(),
      proteinG,
      carbsG,
      fatG,
      foodName: null,
      grams: null,
      unit: null,
      barcode: null,
    });
    setProteinInput('');
    setCarbsInput('');
    setFatInput('');
  };

  const handleAddWeight = async () => {
    const weightKg = num(weightInput);
    if (weightKg <= 0) return;
    await addBodyWeightEntry({ date: todayKey(), weightKg });
    setWeightInput('');
  };

  const handleAddMeasurement = async () => {
    const valueCm = num(measurementInput);
    if (valueCm <= 0) return;
    await addMeasurementEntry({ date: todayKey(), type: measurementType, valueCm });
    setMeasurementInput('');
  };

  const handleToggleCustomTargets = async (enabled: boolean) => {
    if (enabled) {
      const base = currentWeight ? macroTargets(currentWeight, goal) : { proteinG: 150, carbsG: 200, fatG: 70 };
      await updateProfile({ customProteinG: base.proteinG, customCarbsG: base.carbsG, customFatG: base.fatG });
    } else {
      await updateProfile({ customProteinG: null, customCarbsG: null, customFatG: null });
    }
  };

  const handleSaveCustomTargets = () => {
    Keyboard.dismiss();
    updateProfile({
      customProteinG: num(customProteinInput),
      customCarbsG: num(customCarbsInput),
      customFatG: num(customFatInput),
    });
  };

  const startEditEntry = (entry: NutritionEntry) => {
    setEditingEntryId(entry.id);
    if (entry.foodName) {
      setEditGrams(entry.grams ? String(entry.grams) : '');
    } else {
      setEditProtein(String(entry.proteinG));
      setEditCarbs(String(entry.carbsG));
      setEditFat(String(entry.fatG));
    }
  };

  const saveEditEntry = async (entry: NutritionEntry) => {
    Keyboard.dismiss();
    if (entry.foodName) {
      const newGrams = num(editGrams);
      if (newGrams <= 0 || !entry.grams) return;
      const ratio = newGrams / entry.grams;
      await updateNutritionEntry(entry.id, {
        grams: newGrams,
        proteinG: Math.round(entry.proteinG * ratio * 10) / 10,
        carbsG: Math.round(entry.carbsG * ratio * 10) / 10,
        fatG: Math.round(entry.fatG * ratio * 10) / 10,
      });
    } else {
      await updateNutritionEntry(entry.id, {
        proteinG: num(editProtein),
        carbsG: num(editCarbs),
        fatG: num(editFat),
      });
    }
    setEditingEntryId(null);
  };

  return (
    <ThemedView variant="grouped" style={{ flex: 1 }}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScreenHeader title={t.tabs.nutrition} mascot="content" />
        <ScrollView
          contentContainerStyle={{
            padding: Spacing.lg,
            gap: Spacing.lg,
            paddingBottom: Spacing.xxl,
          }}
        >
          <Section title={t.nutrition.today}>
            <Card style={{ gap: Spacing.md }}>
              {targets ? (
                <>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <ThemedText variant="title2" weight="700">
                      {todayTotals.calories.toFixed(0)} kcal
                    </ThemedText>
                    <ThemedText variant="subhead" color="secondary">
                      {t.nutrition.objective} : {targets.calories} kcal
                    </ThemedText>
                  </View>

                  <View style={{ gap: 6 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <ThemedText variant="footnote" color="secondary">
                        {t.nutrition.protein}
                      </ThemedText>
                      <ThemedText variant="footnote" color="secondary">
                        {todayTotals.proteinG.toFixed(0)} / {targets.proteinG} g
                      </ThemedText>
                    </View>
                    <ProgressBar progress={todayTotals.proteinG / targets.proteinG} tintColor={colors.accent} />
                  </View>

                  <View style={{ gap: 6 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <ThemedText variant="footnote" color="secondary">
                        {t.nutrition.carbs}
                      </ThemedText>
                      <ThemedText variant="footnote" color="secondary">
                        {todayTotals.carbsG.toFixed(0)} / {targets.carbsG} g
                      </ThemedText>
                    </View>
                    <ProgressBar progress={todayTotals.carbsG / targets.carbsG} tintColor={colors.positive} />
                  </View>

                  <View style={{ gap: 6 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <ThemedText variant="footnote" color="secondary">
                        {t.nutrition.fat}
                      </ThemedText>
                      <ThemedText variant="footnote" color="secondary">
                        {todayTotals.fatG.toFixed(0)} / {targets.fatG} g
                      </ThemedText>
                    </View>
                    <ProgressBar progress={todayTotals.fatG / targets.fatG} tintColor={colors.textSecondary} />
                  </View>
                </>
              ) : (
                <ThemedText color="secondary">{t.nutrition.addWeightPrompt}</ThemedText>
              )}

              <Pressable
                onPress={() => router.push('/food-search')}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  paddingVertical: Spacing.md,
                  borderRadius: 12,
                  backgroundColor: colors.accent,
                }}
              >
                <Ionicons name="barcode-outline" size={20} color={colors.onAccent} />
                <ThemedText variant="subhead" weight="600" style={{ color: colors.onAccent }}>
                  {t.nutrition.scanOrSearchFood}
                </ThemedText>
              </Pressable>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                <View style={{ flex: 1, height: 1, backgroundColor: colors.separator }} />
                <ThemedText variant="caption" color="tertiary">
                  {t.nutrition.orEnterManually}
                </ThemedText>
                <View style={{ flex: 1, height: 1, backgroundColor: colors.separator }} />
              </View>

              <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <ThemedText variant="caption" color="tertiary">
                    {t.nutrition.proteinG}
                  </ThemedText>
                  <Input keyboardType="decimal-pad" value={proteinInput} onChangeText={setProteinInput} placeholder="0" />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText variant="caption" color="tertiary">
                    {t.nutrition.carbsG}
                  </ThemedText>
                  <Input keyboardType="decimal-pad" value={carbsInput} onChangeText={setCarbsInput} placeholder="0" />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText variant="caption" color="tertiary">
                    {t.nutrition.fatG}
                  </ThemedText>
                  <Input keyboardType="decimal-pad" value={fatInput} onChangeText={setFatInput} placeholder="0" />
                </View>
              </View>
              <Button title={t.common.add} onPress={handleAddNutrition} />

              {todayEntries.length > 0 && (
                <View style={{ gap: Spacing.sm }}>
                  {todayEntries.map((entry) =>
                    editingEntryId === entry.id ? (
                      <View key={entry.id} style={{ gap: Spacing.sm, backgroundColor: colors.fill, padding: Spacing.sm, borderRadius: Radius.md }}>
                        {entry.foodName ? (
                          <View>
                            <ThemedText variant="subhead" weight="600">
                              {entry.foodName}
                            </ThemedText>
                            <ThemedText variant="caption" color="tertiary" style={{ marginBottom: 4 }}>
                              {t.nutrition.quantity} ({entry.unit ?? 'g'})
                            </ThemedText>
                            <Input keyboardType="decimal-pad" value={editGrams} onChangeText={setEditGrams} />
                          </View>
                        ) : (
                          <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                            <View style={{ flex: 1 }}>
                              <ThemedText variant="caption" color="tertiary">P (g)</ThemedText>
                              <Input keyboardType="decimal-pad" value={editProtein} onChangeText={setEditProtein} />
                            </View>
                            <View style={{ flex: 1 }}>
                              <ThemedText variant="caption" color="tertiary">G (g)</ThemedText>
                              <Input keyboardType="decimal-pad" value={editCarbs} onChangeText={setEditCarbs} />
                            </View>
                            <View style={{ flex: 1 }}>
                              <ThemedText variant="caption" color="tertiary">L (g)</ThemedText>
                              <Input keyboardType="decimal-pad" value={editFat} onChangeText={setEditFat} />
                            </View>
                          </View>
                        )}
                        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                          <Button title={t.common.save} onPress={() => saveEditEntry(entry)} style={{ flex: 1 }} />
                          <IconButton name="close" onPress={() => setEditingEntryId(null)} />
                        </View>
                      </View>
                    ) : (
                      <View
                        key={entry.id}
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <Pressable onPress={() => startEditEntry(entry)} style={{ flex: 1, paddingVertical: 4 }}>
                          {entry.foodName ? (
                            <>
                              <ThemedText variant="subhead">
                                {entry.foodName} {entry.grams ? `· ${entry.grams}${entry.unit ?? 'g'}` : ''}
                              </ThemedText>
                              <ThemedText variant="caption" color="tertiary">
                                P {entry.proteinG}g · G {entry.carbsG}g · L {entry.fatG}g
                              </ThemedText>
                            </>
                          ) : (
                            <ThemedText variant="subhead" color="secondary">
                              P {entry.proteinG}g · G {entry.carbsG}g · L {entry.fatG}g
                            </ThemedText>
                          )}
                        </Pressable>
                        <IconButton
                          name="trash-outline"
                          variant="destructive"
                          size={18}
                          onPress={() => removeNutritionEntry(entry.id)}
                        />
                      </View>
                    )
                  )}
                </View>
              )}
            </Card>
          </Section>

          <Section title={t.nutrition.nutritionalGoal}>
            <Card style={{ gap: Spacing.md }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <ThemedText variant="subhead">{t.nutrition.customTargets}</ThemedText>
                  <ThemedText variant="caption" color="tertiary">
                    {t.nutrition.autoCalculated}
                  </ThemedText>
                </View>
                <Switch
                  value={isCustomTargets}
                  onValueChange={handleToggleCustomTargets}
                  trackColor={{ true: colors.accent }}
                />
              </View>

              {isCustomTargets && (
                <View style={{ gap: Spacing.sm }}>
                  <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                    <View style={{ flex: 1 }}>
                      <ThemedText variant="caption" color="tertiary">
                        {t.nutrition.proteinG}
                      </ThemedText>
                      <Input
                        keyboardType="decimal-pad"
                        value={customProteinInput}
                        onChangeText={setCustomProteinInput}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <ThemedText variant="caption" color="tertiary">
                        {t.nutrition.carbsG}
                      </ThemedText>
                      <Input
                        keyboardType="decimal-pad"
                        value={customCarbsInput}
                        onChangeText={setCustomCarbsInput}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <ThemedText variant="caption" color="tertiary">
                        {t.nutrition.fatG}
                      </ThemedText>
                      <Input
                        keyboardType="decimal-pad"
                        value={customFatInput}
                        onChangeText={setCustomFatInput}
                      />
                    </View>
                  </View>
                  <ThemedText variant="caption" color="tertiary">
                    {t.nutrition.equivalentKcal} {Math.round(num(customProteinInput) * 4 + num(customCarbsInput) * 4 + num(customFatInput) * 9)} kcal
                  </ThemedText>
                  <Button title={t.common.save} onPress={handleSaveCustomTargets} />
                </View>
              )}
            </Card>
          </Section>

          <Section title={t.nutrition.bodyWeight}>
            <Card style={{ gap: Spacing.md }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <ThemedText variant="title2" weight="700">
                  {currentWeight ? `${currentWeight} kg` : '—'}
                </ThemedText>
                <ThemedText variant="footnote" color="secondary">
                  {t.nutrition.lastWeighIn}
                </ThemedText>
              </View>
              {weightSeries.length >= 2 && (
                <LineChart
                  data={weightSeries.map((p) => ({ value: p.value }))}
                  color={colors.accent}
                  dataPointsColor={colors.accent}
                  startFillColor={colors.accent}
                  spacing={(320 - 16) / Math.max(weightSeries.length - 1, 1)}
                  {...chartCommonProps}
                />
              )}
              <View style={{ flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-end' }}>
                <View style={{ flex: 1 }}>
                  <ThemedText variant="caption" color="tertiary">
                    {t.nutrition.weight} (kg)
                  </ThemedText>
                  <Input
                    keyboardType="decimal-pad"
                    value={weightInput}
                    onChangeText={setWeightInput}
                    placeholder="0"
                  />
                </View>
                <Button title={t.common.add} onPress={handleAddWeight} style={{ paddingHorizontal: Spacing.lg }} />
              </View>

              {recentWeights.length > 0 && (
                <View style={{ gap: 4 }}>
                  {recentWeights.map((entry) => (
                    <View
                      key={entry.id}
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <ThemedText variant="subhead" color="secondary">
                        {entry.date} · {entry.weightKg} kg
                      </ThemedText>
                      <IconButton
                        name="trash-outline"
                        variant="destructive"
                        size={18}
                        onPress={() => removeBodyWeightEntry(entry.id)}
                      />
                    </View>
                  ))}
                </View>
              )}
            </Card>
          </Section>

          {user?.measurementsEnabled && (
            <Section title={t.nutrition.measurements}>
              <Card style={{ gap: Spacing.md }}>
                <ChipSelector
                  options={MEASUREMENT_TYPE_OPTIONS.map((o) => o.label)}
                  value={MEASUREMENT_TYPE_LABELS[measurementType]}
                  onChange={(label) => {
                    const match = MEASUREMENT_TYPE_OPTIONS.find((o) => o.label === label);
                    if (match) setMeasurementType(match.value);
                  }}
                />

                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <ThemedText variant="title2" weight="700">
                    {latestMeasurement ? `${latestMeasurement.valueCm} cm` : '—'}
                  </ThemedText>
                  <ThemedText variant="footnote" color="secondary">
                    {t.nutrition.lastMeasurement}
                  </ThemedText>
                </View>

                <View style={{ flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-end' }}>
                  <View style={{ flex: 1 }}>
                    <ThemedText variant="caption" color="tertiary">
                      {MEASUREMENT_TYPE_LABELS[measurementType]} (cm)
                    </ThemedText>
                    <Input
                      keyboardType="decimal-pad"
                      value={measurementInput}
                      onChangeText={setMeasurementInput}
                      placeholder="0"
                    />
                  </View>
                  <Button title={t.common.add} onPress={handleAddMeasurement} style={{ paddingHorizontal: Spacing.lg }} />
                </View>

                {recentMeasurements.length > 0 && (
                  <View style={{ gap: 4 }}>
                    {recentMeasurements.map((entry) => (
                      <View
                        key={entry.id}
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <ThemedText variant="subhead" color="secondary">
                          {entry.date} · {entry.valueCm} cm
                        </ThemedText>
                        <IconButton
                          name="trash-outline"
                          variant="destructive"
                          size={18}
                          onPress={() => removeMeasurementEntry(entry.id)}
                        />
                      </View>
                    ))}
                  </View>
                )}
              </Card>
            </Section>
          )}

          {currentBmi != null && (
            <Section title={t.nutrition.bmi}>
              <Card style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <ThemedText variant="title2" weight="700">
                  {currentBmi.toFixed(1)}
                </ThemedText>
                <ThemedText variant="subhead" color="secondary">
                  {t.nutrition.bmiCategories[bmiCategory(currentBmi)]}
                </ThemedText>
              </Card>
            </Section>
          )}

          <Section title={t.nutrition.evolution}>
            <Card style={{ gap: Spacing.md }}>
              <SegmentedControl options={MACRO_OPTIONS} value={macro} onChange={setMacro} />
              {macroSeries.some((p) => p[macro] > 0) ? (
                <LineChart
                  data={macroSeries.map((p) => ({ value: p[macro] }))}
                  color={colors.accent}
                  dataPointsColor={colors.accent}
                  startFillColor={colors.accent}
                  spacing={(320 - 16) / Math.max(macroSeries.length - 1, 1)}
                  {...chartCommonProps}
                />
              ) : (
                <ThemedText color="tertiary" style={{ textAlign: 'center', paddingVertical: Spacing.lg }}>
                  {t.nutrition.noDataForPeriod}
                </ThemedText>
              )}
              <SegmentedControl options={RANGE_OPTIONS} value={range} onChange={setRange} />
            </Card>
          </Section>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}
