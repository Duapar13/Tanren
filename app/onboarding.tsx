import { useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '../components/ThemedText';
import { ThemedView } from '../components/ThemedView';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { SegmentedControl } from '../components/SegmentedControl';
import { NingymaWordmark } from '../components/NingymaWordmark';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import { Spacing } from '../constants/theme';
import { NutritionGoal } from '../types';
import { todayKey } from '../utils/date';
import { authErrorMessage } from '../lib/authErrors';

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

// Lundi en premier pour matcher WeekStrip ; dow = index JS (0=dimanche..6=samedi).
const WEEKDAY_DOWS = [1, 2, 3, 4, 5, 6, 0];
const WEEKDAY_LABELS: Record<string, string[]> = {
  fr: ['L', 'M', 'M', 'J', 'V', 'S', 'D'],
  en: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
  it: ['L', 'M', 'M', 'G', 'V', 'S', 'D'],
  es: ['L', 'M', 'M', 'J', 'V', 'S', 'D'],
};

const num = (v: string) => {
  const n = parseFloat(v.replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

export default function OnboardingScreen() {
  const { user, updateProfile } = useAuth();
  const { addBodyWeightEntry } = useData();
  const { colors } = useTheme();
  const { t, lang } = useTranslation();
  const WEEKDAYS = WEEKDAY_DOWS.map((dow, i) => ({ dow, label: WEEKDAY_LABELS[lang][i] }));

  const GOAL_OPTIONS: { label: string; value: NutritionGoal }[] = [
    { label: t.onboarding.goalBulk, value: 'bulk' },
    { label: t.onboarding.goalCut, value: 'cut' },
    { label: t.onboarding.goalMaintain, value: 'maintain' },
  ];

  const [usernameInput, setUsernameInput] = useState(user?.username ?? '');
  const [usernameError, setUsernameError] = useState<string | null>(null);
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
    setUsernameError(null);

    const trimmedUsername = usernameInput.trim();
    if (!skip && !USERNAME_RE.test(trimmedUsername)) {
      setUsernameError(t.onboarding.usernameValidationError);
      return;
    }

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
      if (trimmedUsername !== user?.username) patch.username = trimmedUsername;
      const heightCm = num(heightInput);
      if (heightCm > 0) patch.heightCm = heightCm;
      await updateProfile(patch);

      const weightKg = num(weightInput);
      if (weightKg > 0) {
        await addBodyWeightEntry({ date: todayKey(), weightKg });
      }
    } catch (err) {
      setUsernameError(authErrorMessage(err));
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
                <NingymaWordmark size={44} />
                <ThemedText variant="subhead" color="secondary" style={{ textAlign: 'center' }}>
                  {t.onboarding.subtitle}
                </ThemedText>
              </View>

              <View style={{ gap: Spacing.sm }}>
                <ThemedText variant="headline">{t.onboarding.usernameTitle}</ThemedText>
                <ThemedText variant="footnote" color="tertiary">
                  {t.onboarding.usernameHint}
                </ThemedText>
                <Card>
                  <Input
                    value={usernameInput}
                    onChangeText={(v) => {
                      setUsernameInput(v);
                      setUsernameError(null);
                    }}
                    autoCapitalize="none"
                    autoCorrect={false}
                    placeholder={t.onboarding.usernamePlaceholder}
                  />
                </Card>
                {usernameError && (
                  <ThemedText variant="footnote" style={{ color: colors.negative }}>
                    {usernameError}
                  </ThemedText>
                )}
              </View>

              <View style={{ gap: Spacing.sm }}>
                <ThemedText variant="headline">{t.onboarding.bodyTitle}</ThemedText>
                <ThemedText variant="footnote" color="tertiary">
                  {t.onboarding.bodyHint}
                </ThemedText>
                <Card style={{ gap: Spacing.md }}>
                  <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                    <View style={{ flex: 1 }}>
                      <ThemedText variant="caption" color="tertiary">
                        {t.onboarding.heightLabel} (cm)
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
                        {t.onboarding.weightLabel} (kg)
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
                <ThemedText variant="headline">{t.onboarding.goalTitle}</ThemedText>
                <Card>
                  <SegmentedControl options={GOAL_OPTIONS} value={goal} onChange={setGoal} />
                </Card>
              </View>

              <View style={{ gap: Spacing.sm }}>
                <ThemedText variant="headline">{t.onboarding.programTitle}</ThemedText>
                <ThemedText variant="footnote" color="tertiary">
                  {t.onboarding.programHint}
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
                <ThemedText variant="headline">{t.onboarding.measurementsTitle}</ThemedText>
                <Card style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <ThemedText variant="subhead">{t.onboarding.measurementsToggleLabel}</ThemedText>
                    <ThemedText variant="caption" color="tertiary">
                      {t.onboarding.measurementsHint}
                    </ThemedText>
                  </View>
                  <Switch value={measurementsEnabled} onValueChange={setMeasurementsEnabled} trackColor={{ true: colors.accent }} />
                </Card>
              </View>

              <View style={{ gap: Spacing.md }}>
                <Button
                  title={submitting ? '…' : t.onboarding.ctaStart}
                  onPress={() => finish(false)}
                  disabled={submitting}
                />
                <Pressable onPress={() => finish(true)} disabled={submitting} style={{ alignItems: 'center', paddingVertical: Spacing.sm }}>
                  <ThemedText variant="subhead" color="secondary">
                    {t.onboarding.ctaSkip}
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
