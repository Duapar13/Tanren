import { useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '../components/ThemedText';
import { ThemedView } from '../components/ThemedView';
import { Button } from '../components/Button';
import { ShareCard } from '../components/ShareCard';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../hooks/useTheme';
import { LOCALE_MAP, useTranslation } from '../hooks/useTranslation';
import { Radius, Spacing } from '../constants/theme';
import { computeMonthlyRecap } from '../utils/monthlyStats';
import { shareCardAsImage } from '../lib/shareCard';
import { formatWeight } from '../utils/units';

export default function MonthRecapScreen() {
  const { year, month } = useLocalSearchParams<{ year: string; month: string }>();
  const { sets, sessions } = useData();
  const { user } = useAuth();
  const weightUnit = user?.weightUnit ?? 'kg';
  const { colors } = useTheme();
  const { t, lang } = useTranslation();
  const cardRef = useRef<View>(null);
  const [sharing, setSharing] = useState(false);
  const [showAllBest, setShowAllBest] = useState(false);
  const BEST_PREVIEW_COUNT = 6;

  const viewYear = Number(year);
  const viewMonth = Number(month);

  const monthLabel = useMemo(() => {
    const label = new Date(viewYear, viewMonth, 1).toLocaleDateString(LOCALE_MAP[lang], { month: 'long', year: 'numeric' });
    return label.charAt(0).toUpperCase() + label.slice(1);
  }, [viewYear, viewMonth, lang]);

  const recap = useMemo(
    () => computeMonthlyRecap(sets, sessions, viewYear, viewMonth),
    [sets, sessions, viewYear, viewMonth]
  );
  const { current, previousMonth } = recap;

  // A single, clear vs-last-month trend instead of stacking 3/6/12-month averages that read
  // as noise (and can print triple-digit percentages) once there's only a month or two of data.
  const trend = useMemo(() => {
    if (previousMonth.totalVolume <= 0) {
      return current.totalVolume > 0 ? { label: t.monthRecap.newLabel, positive: true } : null;
    }
    const pct = Math.round(((current.totalVolume - previousMonth.totalVolume) / previousMonth.totalVolume) * 100);
    return { label: `${pct >= 0 ? '+' : ''}${pct}%`, positive: pct >= 0 };
  }, [current.totalVolume, previousMonth.totalVolume, t.monthRecap.newLabel]);

  const handleShare = async () => {
    setSharing(true);
    try {
      await shareCardAsImage(cardRef);
    } catch {
      Alert.alert(t.sessionDetail.shareErrorTitle, t.sessionDetail.shareErrorBody);
    } finally {
      setSharing(false);
    }
  };

  return (
    <ThemedView variant="grouped" style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.lg }}>
        <ThemedText variant="title1">{monthLabel}</ThemedText>

        <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
          <Stat label={t.monthRecap.sessions} value={String(current.sessionCount)} />
          <Stat label={t.monthRecap.sets} value={String(current.setCount)} />
          <Stat label={t.monthRecap.volume} value={formatWeight(current.totalVolume, weightUnit, 0)} />
        </View>

        {trend && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              alignSelf: 'center',
              paddingHorizontal: Spacing.md,
              paddingVertical: 6,
              borderRadius: 999,
              backgroundColor: (trend.positive ? colors.positive : colors.negative) + '1A',
            }}
          >
            <Ionicons
              name={trend.positive ? 'trending-up' : 'trending-down'}
              size={14}
              color={trend.positive ? colors.positive : colors.negative}
            />
            <ThemedText variant="footnote" weight="700" style={{ color: trend.positive ? colors.positive : colors.negative }}>
              {trend.label}
            </ThemedText>
            <ThemedText variant="footnote" color="tertiary">
              {t.monthRecap.vsLastMonth}
            </ThemedText>
          </View>
        )}

        <View>
          <ThemedText variant="headline" style={{ marginBottom: Spacing.sm }}>
            {t.monthRecap.bestOfMonth}
          </ThemedText>
          {current.bestPerformances.length === 0 ? (
            <ThemedText variant="footnote" color="tertiary">
              {t.monthRecap.noNewRecord}
            </ThemedText>
          ) : (
            <>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
                {(showAllBest ? current.bestPerformances : current.bestPerformances.slice(0, BEST_PREVIEW_COUNT)).map(
                  (p, i) => (
                    <View
                      key={i}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        paddingHorizontal: Spacing.sm,
                        paddingVertical: Spacing.xs,
                        borderRadius: Radius.md,
                        backgroundColor: colors.positive + '14',
                        borderWidth: 1,
                        borderColor: colors.positive + '33',
                      }}
                    >
                      <Ionicons name="trophy" size={14} color={colors.positive} />
                      <ThemedText variant="footnote" weight="600">
                        {p.exerciseName}
                      </ThemedText>
                      <ThemedText variant="footnote" weight="700" style={{ color: colors.positive }}>
                        {formatWeight(p.est1RM, weightUnit)}
                      </ThemedText>
                    </View>
                  )
                )}
              </View>
              {current.bestPerformances.length > BEST_PREVIEW_COUNT && (
                <Pressable onPress={() => setShowAllBest((v) => !v)} style={{ marginTop: Spacing.sm }}>
                  <ThemedText variant="footnote" weight="600" color="accent">
                    {showAllBest ? t.monthRecap.showLessBest : t.monthRecap.showAllBest(current.bestPerformances.length)}
                  </ThemedText>
                </Pressable>
              )}
            </>
          )}
        </View>

        <View>
          <ThemedText variant="headline" style={{ marginBottom: Spacing.sm }}>
            {t.monthRecap.toChallenge}
          </ThemedText>
          {current.stagnant.length === 0 ? (
            <ThemedText variant="footnote" color="tertiary">
              {t.monthRecap.noneToChallenge}
            </ThemedText>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
              {current.stagnant.map((s) => (
                <View
                  key={s.exerciseId}
                  style={{
                    paddingHorizontal: Spacing.sm,
                    paddingVertical: Spacing.xs,
                    borderRadius: Radius.md,
                    backgroundColor: colors.fill,
                  }}
                >
                  <ThemedText variant="footnote" color="secondary">
                    {s.exerciseName}
                  </ThemedText>
                </View>
              ))}
            </View>
          )}
        </View>

        <ThemedText variant="headline">{t.sessionDetail.yourSheet}</ThemedText>
        <View style={{ alignItems: 'center', gap: Spacing.md }}>
          <ShareCard
            ref={cardRef}
            variant="month"
            monthLabel={monthLabel}
            sessionCount={current.sessionCount}
            setCount={current.setCount}
            totalVolume={current.totalVolume}
            bestPerformances={current.bestPerformances}
            weightUnit={weightUnit}
          />
          <Button title={sharing ? t.sessionDetail.generating : t.sessionDetail.share} onPress={handleShare} disabled={sharing} style={{ width: '100%' }} />
        </View>
      </ScrollView>
    </ThemedView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <ThemedText variant="title3" weight="700">
        {value}
      </ThemedText>
      <ThemedText variant="caption" color="tertiary">
        {label}
      </ThemedText>
    </View>
  );
}
