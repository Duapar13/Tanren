import { useEffect, useMemo } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '../components/ThemedText';
import { Gyma } from '../components/mascot/Gyma';
import { ThemedView } from '../components/ThemedView';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Section } from '../components/Section';
import { StatTile } from '../components/StatTile';
import { XPBadge } from '../components/XPBadge';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../hooks/useTheme';
import { useRanking } from '../hooks/useRanking';
import { LOCALE_MAP, useTranslation } from '../hooks/useTranslation';
import { Spacing } from '../constants/theme';
import { formatLongDate, todayKey } from '../utils/date';
import { formatWeight } from '../utils/units';

const DOT_COUNT = 18;

function BurstDot({ index, progress, color }: { index: number; progress: SharedValue<number>; color: string }) {
  const angle = (index / DOT_COUNT) * Math.PI * 2;
  const distance = 90 + (index % 3) * 28;
  const style = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    transform: [
      { translateX: Math.cos(angle) * distance * progress.value },
      { translateY: Math.sin(angle) * distance * progress.value },
      { scale: 1 - progress.value * 0.4 },
    ],
  }));
  return (
    <Animated.View
      style={[{ position: 'absolute', width: 10, height: 10, borderRadius: 5, backgroundColor: color }, style]}
    />
  );
}

/** Shown right after finishing a workout: headline numbers, records broken and season points earned. */
export default function SessionRecapScreen() {
  const params = useLocalSearchParams<{
    startedAt?: string;
    sets?: string;
    volumeKg?: string;
    exercises?: string;
    records?: string;
    startPoints?: string;
  }>();
  const { user } = useAuth();
  const { colors } = useTheme();
  const { t, lang } = useTranslation();
  const { ranking } = useRanking();
  const weightUnit = user?.weightUnit ?? 'kg';

  const sets = Number(params.sets ?? 0);
  const volumeKg = Number(params.volumeKg ?? 0);
  const exercisesCount = Number(params.exercises ?? 0);
  const minutes = Math.max(1, Math.round((Date.now() - Number(params.startedAt ?? Date.now())) / 60000));
  const records = useMemo(() => {
    try {
      return JSON.parse(params.records ?? '[]') as { exerciseId: number; name: string; weightKg: number }[];
    } catch {
      return [];
    }
  }, [params.records]);
  const pointsDelta = params.startPoints != null ? ranking.totalPoints - Number(params.startPoints) : 0;

  const burst = useSharedValue(0);
  const trophyScale = useSharedValue(0);
  useEffect(() => {
    trophyScale.value = withDelay(120, withSequence(withSpring(1.25, { damping: 5, stiffness: 170 }), withSpring(1, { damping: 9 })));
    burst.value = withDelay(220, withTiming(1, { duration: 1100, easing: Easing.out(Easing.cubic) }));
  }, [burst, trophyScale]);
  const trophyStyle = useAnimatedStyle(() => ({ transform: [{ scale: trophyScale.value }] }));

  const confettiColors = [colors.accent, colors.positive, '#F5C542', colors.text];

  return (
    <ThemedView variant="grouped" style={{ flex: 1 }}>
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.xl, paddingBottom: Spacing.xl }}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ alignItems: 'center', gap: Spacing.md, paddingTop: Spacing.xl }}>
            <View style={{ width: 200, height: 220, alignItems: 'center', justifyContent: 'center' }}>
              {Array.from({ length: DOT_COUNT }, (_, i) => (
                <BurstDot key={i} index={i} progress={burst} color={confettiColors[i % confettiColors.length]} />
              ))}
              <Animated.View style={trophyStyle}>
                <Gyma pose="victory" size={150} animated />
              </Animated.View>
            </View>
            <ThemedText variant="largeTitle" style={{ textAlign: 'center' }}>
              {t.recap.title}
            </ThemedText>
            <ThemedText variant="subhead" color="secondary">
              {formatLongDate(todayKey(), LOCALE_MAP[lang])}
            </ThemedText>
          </View>

          <View style={{ gap: Spacing.sm }}>
            <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
              <StatTile label={t.recap.duration} value={t.recap.minutes(minutes)} />
              <StatTile label={t.recap.volume} value={formatWeight(volumeKg, weightUnit, 0)} />
            </View>
            <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
              <StatTile label={t.recap.sets} value={String(sets)} />
              <StatTile label={t.seance.exerciseCount(exercisesCount).replace(/^\d+\s*/, '')} value={String(exercisesCount)} />
            </View>
          </View>

          {pointsDelta !== 0 && (
            <Card style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <ThemedText variant="subhead" weight="700">
                {t.recap.points}
              </ThemedText>
              <XPBadge points={pointsDelta} />
            </Card>
          )}

          <Section title={t.recap.records}>
            {records.length === 0 ? (
              <Card>
                <ThemedText color="secondary" style={{ textAlign: 'center' }}>
                  {t.recap.noRecords}
                </ThemedText>
              </Card>
            ) : (
              <Card variant="accent" style={{ gap: Spacing.md }}>
                {records.map((r) => (
                  <View key={r.exerciseId} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
                    <Ionicons name="trophy" size={18} color={colors.accent} />
                    <ThemedText variant="subhead" weight="700" style={{ flex: 1 }} numberOfLines={1}>
                      {r.name}
                    </ThemedText>
                    <ThemedText variant="headline" weight="800" color="accent">
                      {formatWeight(r.weightKg, weightUnit)}
                    </ThemedText>
                  </View>
                ))}
              </Card>
            )}
          </Section>

          <View style={{ gap: Spacing.sm }}>
            <Button title={t.recap.backHome} onPress={() => router.replace('/(tabs)')} />
            <Button
              title={t.recap.share}
              variant="tonal"
              onPress={() => router.replace({ pathname: '/session-detail', params: { date: todayKey() } })}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}
