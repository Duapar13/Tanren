import { useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '../components/ThemedText';
import { ThemedView } from '../components/ThemedView';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { SegmentedControl } from '../components/SegmentedControl';
import { TanrenWordmark } from '../components/TanrenWordmark';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useTheme } from '../hooks/useTheme';
import { Spacing } from '../constants/theme';
import { NutritionGoal } from '../types';
import { todayKey } from '../utils/date';

const GOAL_OPTIONS: { label: string; value: NutritionGoal }[] = [
  { label: 'Masse', value: 'bulk' },
  { label: 'Sèche', value: 'cut' },
  { label: 'Maintien', value: 'maintain' },
];

// Lundi en premier pour matcher WeekStrip ; dow = index JS (0=dimanche..6=samedi).
const WEEKDAYS: { label: string; dow: number }[] = [
  { label: 'L', dow: 1 },
  { label: 'M', dow: 2 },
  { label: 'M', dow: 3 },
  { label: 'J', dow: 4 },
  { label: 'V', dow: 5 },
  { label: 'S', dow: 6 },
  { label: 'D', dow: 0 },
];

const num = (v: string) => {
  const n = parseFloat(v.replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

export default function OnboardingScreen() {
  const { updateProfile } = useAuth();
  const { addBodyWeightEntry } = useData();
  const { colors } = useTheme();

  const [heightInput, setHeightInput] = useState('');
  const [weightInput, setWeightInput] = useState('');
  const [goal, setGoal] = useState<NutritionGoal>('maintain');
  const [trainingDays, setTrainingDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [measurementsEnabled, setMeasurementsEnabled] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const toggleDay = (dow: number) => {
    setTrainingDays((prev) => (prev.includes(dow) ? prev.filter((d) => d !== dow) : [...prev, dow]));
  };

  const finish = async (skip: boolean) => {
    Keyboard.dismiss();
    setSubmitting(true);
    try {
      if (skip) {
        await updateProfile({ onboardingCompleted: true });
        return;
      }

      const patch: Parameters<typeof updateProfile>[0] = {
        goal,
        trainingDays,
        measurementsEnabled,
        onboardingCompleted: true,
      };
      const heightCm = num(heightInput);
      if (heightCm > 0) patch.heightCm = heightCm;
      await updateProfile(patch);

      const weightKg = num(weightInput);
      if (weightKg > 0) {
        await addBodyWeightEntry({ date: todayKey(), weightKg });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={{ flex: 1 }} onPress={Keyboard.dismiss}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.xl, paddingBottom: Spacing.xxl }}
            >
              <View style={{ alignItems: 'center', gap: Spacing.xs }}>
                <TanrenWordmark size={44} />
                <ThemedText variant="subhead" color="secondary" style={{ textAlign: 'center' }}>
                  Quelques infos pour préparer ton suivi — tu peux tout changer plus tard dans Profil.
                </ThemedText>
              </View>

              <View style={{ gap: Spacing.sm }}>
                <ThemedText variant="headline">Ton corps</ThemedText>
                <ThemedText variant="footnote" color="tertiary">
                  Sert à calculer tes objectifs de calories et macros, et ton IMC.
                </ThemedText>
                <Card style={{ gap: Spacing.md }}>
                  <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                    <View style={{ flex: 1 }}>
                      <ThemedText variant="caption" color="tertiary">
                        Taille (cm)
                      </ThemedText>
                      <Input
                        keyboardType="decimal-pad"
                        value={heightInput}
                        onChangeText={setHeightInput}
                        placeholder="ex. 178"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <ThemedText variant="caption" color="tertiary">
                        Poids actuel (kg)
                      </ThemedText>
                      <Input
                        keyboardType="decimal-pad"
                        value={weightInput}
                        onChangeText={setWeightInput}
                        placeholder="ex. 75"
                      />
                    </View>
                  </View>
                </Card>
              </View>

              <View style={{ gap: Spacing.sm }}>
                <ThemedText variant="headline">Ton objectif</ThemedText>
                <Card>
                  <SegmentedControl options={GOAL_OPTIONS} value={goal} onChange={setGoal} />
                </Card>
              </View>

              <View style={{ gap: Spacing.sm }}>
                <ThemedText variant="headline">Ton programme</ThemedText>
                <ThemedText variant="footnote" color="tertiary">
                  Les jours où tu vas t'entraîner — ça compte pour ta régularité dans le classement.
                </ThemedText>
                <Card>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {WEEKDAYS.map(({ label, dow }) => {
                      const selected = trainingDays.includes(dow);
                      return (
                        <Pressable
                          key={dow}
                          onPress={() => toggleDay(dow)}
                          style={{
                            flex: 1,
                            aspectRatio: 1,
                            borderRadius: 999,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: selected ? colors.accent : colors.fill,
                          }}
                        >
                          <ThemedText variant="subhead" weight="600" style={{ color: selected ? '#FFFFFF' : colors.text }}>
                            {label}
                          </ThemedText>
                        </Pressable>
                      );
                    })}
                  </View>
                </Card>
              </View>

              <View style={{ gap: Spacing.sm }}>
                <ThemedText variant="headline">Mensurations</ThemedText>
                <Card style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <ThemedText variant="subhead">Suivre bras, taille, torse, cuisses...</ThemedText>
                    <ThemedText variant="caption" color="tertiary">
                      Activable ou désactivable à tout moment dans Profil
                    </ThemedText>
                  </View>
                  <Switch value={measurementsEnabled} onValueChange={setMeasurementsEnabled} trackColor={{ true: colors.accent }} />
                </Card>
              </View>

              <View style={{ gap: Spacing.md }}>
                <Button
                  title={submitting ? 'Un instant…' : 'C’est parti'}
                  onPress={() => finish(false)}
                  disabled={submitting}
                />
                <Pressable onPress={() => finish(true)} disabled={submitting} style={{ alignItems: 'center', paddingVertical: Spacing.sm }}>
                  <ThemedText variant="subhead" color="secondary">
                    Passer pour l’instant
                  </ThemedText>
                </Pressable>
              </View>
            </ScrollView>
          </Pressable>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}
