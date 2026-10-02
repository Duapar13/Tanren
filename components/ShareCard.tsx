import { forwardRef } from 'react';
import { View } from 'react-native';
import { NingymaWordmark } from './NingymaWordmark';
import { NinjaMascot } from './NinjaMascot';
import { ThemedText } from './ThemedText';
import { Radius, Spacing, GOLD_ACCENT } from '../constants/theme';
import { SetWithExercise } from '../types';
import { MonthlyBest } from '../utils/monthlyStats';
import { formatWeight, WeightUnit } from '../utils/units';
import { formatLongDate } from '../utils/date';
import { LOCALE_MAP, useTranslation } from '../hooks/useTranslation';

const BG = '#000000';
const CARD_WIDTH = 340;

function groupByExercise(sets: SetWithExercise[]) {
  const map = new Map<number, SetWithExercise[]>();
  for (const s of sets) {
    if (!map.has(s.exerciseId)) map.set(s.exerciseId, []);
    map.get(s.exerciseId)!.push(s);
  }
  return [...map.entries()];
}

interface SessionCardProps {
  variant: 'session';
  date: string;
  sets: SetWithExercise[];
  weightUnit: WeightUnit;
}

interface MonthCardProps {
  variant: 'month';
  monthLabel: string;
  sessionCount: number;
  setCount: number;
  totalVolume: number;
  bestPerformances: MonthlyBest[];
  weightUnit: WeightUnit;
}

type Props = SessionCardProps | MonthCardProps;

/** Fixed-layout branded card, captured to PNG by lib/shareCard.ts and pushed to the native
 * share sheet — the app's "brag about your training" export for Instagram/Snap stories. */
export const ShareCard = forwardRef<View, Props>((props, ref) => {
  const { t, lang } = useTranslation();
  const grouped = props.variant === 'session' ? groupByExercise(props.sets).slice(0, 6) : [];
  const totalVolume =
    props.variant === 'session'
      ? props.sets.reduce((sum, s) => sum + s.weightKg * s.reps, 0)
      : props.totalVolume;
  const setCount = props.variant === 'session' ? props.sets.length : props.setCount;

  return (
    <View
      ref={ref}
      collapsable={false}
      style={{
        width: CARD_WIDTH,
        backgroundColor: BG,
        borderRadius: Radius.xl,
        padding: Spacing.xl,
        gap: Spacing.lg,
        borderWidth: 1,
        borderColor: '#2C2C2E',
      }}
    >
      <View style={{ alignItems: 'center', gap: Spacing.xs }}>
        <NinjaMascot size={64} reaction={props.variant === 'session' ? 'focused' : 'proud'} />
        <NingymaWordmark size={30} style={{ color: GOLD_ACCENT }} />
      </View>

      <View style={{ alignItems: 'center' }}>
        <ThemedText variant="title3" weight="700" style={{ color: '#FFFFFF', textAlign: 'center' }}>
          {props.variant === 'session' ? formatLongDate(props.date, LOCALE_MAP[lang]) : props.monthLabel}
        </ThemedText>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
        {props.variant === 'session' && (
          <CardStat value={String(grouped.length)} label={t.shareCard.exercises} />
        )}
        {props.variant === 'month' && <CardStat value={String(props.sessionCount)} label={t.monthRecap.sessions} />}
        <CardStat value={String(setCount)} label={t.shareCard.sets} />
        <CardStat value={formatWeight(totalVolume, props.weightUnit, 0)} label={t.shareCard.volume} />
      </View>

      {props.variant === 'session' ? (
        <View style={{ gap: 6 }}>
          {grouped.map(([exerciseId, exerciseSets]) => {
            const best = exerciseSets.reduce((a, b) => (b.weightKg > a.weightKg ? b : a));
            return (
              <View key={exerciseId} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <ThemedText variant="footnote" style={{ color: '#C7C7CC' }} numberOfLines={1}>
                  {exerciseSets[0].exerciseName}
                </ThemedText>
                <ThemedText variant="footnote" weight="600" style={{ color: GOLD_ACCENT }}>
                  {formatWeight(best.weightKg, props.weightUnit)} × {best.reps}
                </ThemedText>
              </View>
            );
          })}
        </View>
      ) : (
        <View style={{ gap: 6 }}>
          {props.bestPerformances.length === 0 ? (
            <ThemedText variant="footnote" style={{ color: '#8E8E93', textAlign: 'center' }}>
              {t.shareCard.noRecordYet}
            </ThemedText>
          ) : (
            props.bestPerformances.slice(0, 6).map((p, i) => (
              <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <ThemedText variant="footnote" style={{ color: '#C7C7CC' }} numberOfLines={1}>
                  {p.exerciseName}
                </ThemedText>
                <ThemedText variant="footnote" weight="600" style={{ color: GOLD_ACCENT }}>
                  {formatWeight(p.est1RM, props.weightUnit)}
                </ThemedText>
              </View>
            ))
          )}
        </View>
      )}

      <ThemedText variant="caption" style={{ color: '#5C5C5E', textAlign: 'center' }}>
        {t.shareCard.tagline}
      </ThemedText>
    </View>
  );
});
ShareCard.displayName = 'ShareCard';

function CardStat({ value, label }: { value: string; label: string }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <ThemedText variant="title3" weight="700" style={{ color: '#FFFFFF' }}>
        {value}
      </ThemedText>
      <ThemedText variant="caption" style={{ color: '#8E8E93' }}>
        {label}
      </ThemedText>
    </View>
  );
}
