import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '../ThemedText';
import { Card } from '../Card';
import { Section } from '../Section';
import { ProgressBar } from '../ProgressBar';
import { SkillBanner } from '../SkillBanner';
import { Popup } from '../Popup';
import { RankEmblem } from '../RankEmblem';
import { SeasonMedalBadge } from '../SeasonMedalBadge';
import { PlacementReveal } from '../PlacementReveal';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../hooks/useTheme';
import { useRanking } from '../../hooks/useRanking';
import { LOCALE_MAP, useTranslation } from '../../hooks/useTranslation';
import { Radius, Spacing } from '../../constants/theme';
import {
  computeSeasonMedalHistory,
  computeSeasonRanking,
  daysUntilNextSeason,
  DIVISIONS,
  POINTS_PER_DIVISION,
  RANK_COLORS,
  RANKS,
  type SeasonMedal,
  type SeasonRanking,
} from '../../utils/ranking';
import { hasShownPlacementReveal, markPlacementRevealShown } from '../../utils/placementReveal';

const LADDER_ITEM_WIDTH = 88;

function formatPoints(points: number): string {
  return `${points >= 0 ? '+' : ''}${points} pt${Math.abs(points) > 1 ? 's' : ''}`;
}

function monthLabelForSegment(medal: SeasonMedal, index: number, locale: string): string {
  const start = new Date(`${medal.seasonInfo.startDate}T00:00:00`);
  const d = new Date(start.getFullYear(), start.getMonth() + index, 1);
  const label = d.toLocaleDateString(locale, { month: 'long' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

interface MedalSelection {
  medal: SeasonMedal;
  isCurrent: boolean;
}

/** Season rank hero, points breakdown, rank ladder and past-season medals. */
export function RankView() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { t, lang } = useTranslation();
  const locale = LOCALE_MAP[lang];
  const { rankingParams, ranking, placement, inPlacement } = useRanking();

  const [selectedMedal, setSelectedMedal] = useState<MedalSelection | null>(null);
  const seasonMedals = useMemo(() => computeSeasonMedalHistory(rankingParams), [rankingParams]);

  const { state } = ranking;
  const rankColor = RANK_COLORS[state.rank];
  const currentRankIndex = RANKS.indexOf(state.rank);

  const ladderRef = useRef<ScrollView>(null);
  useEffect(() => {
    // Land the ladder on the player's current rank instead of always starting at Fer.
    const x = Math.max(0, currentRankIndex * LADDER_ITEM_WIDTH - LADDER_ITEM_WIDTH);
    const id = setTimeout(() => ladderRef.current?.scrollTo({ x, animated: false }), 50);
    return () => clearTimeout(id);
  }, [currentRankIndex]);

  // Fires once, the first time this screen notices placement just finished — the AsyncStorage flag
  // stops it replaying on every later visit within the same season.
  const [showReveal, setShowReveal] = useState(false);
  useEffect(() => {
    if (!placement.applicable || placement.inPlacement) return;
    let cancelled = false;
    hasShownPlacementReveal(ranking.seasonInfo.seasonNumber).then((already) => {
      if (cancelled || already) return;
      setShowReveal(true);
      markPlacementRevealShown(ranking.seasonInfo.seasonNumber);
    });
    return () => {
      cancelled = true;
    };
  }, [placement.applicable, placement.inPlacement, ranking.seasonInfo.seasonNumber]);

  const selectedStats: SeasonRanking | null = useMemo(() => {
    if (!selectedMedal) return null;
    if (selectedMedal.isCurrent) return ranking;
    return computeSeasonRanking(rankingParams, selectedMedal.medal.seasonInfo);
  }, [selectedMedal, ranking, rankingParams]);

  return (
    <View style={{ gap: Spacing.xl }}>
      {inPlacement ? (
        <Card variant="accent" style={{ alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xl }}>
          <RankEmblem rank={null} size={112} />
          <ThemedText variant="title1" style={{ marginTop: Spacing.sm }}>
            {t.rang.placementTitle}
          </ThemedText>
          <ThemedText variant="subhead" color="secondary">
            {t.rang.seasonLabel(ranking.seasonInfo.seasonNumber)}
          </ThemedText>

          <View style={{ width: '100%', gap: 8, marginTop: Spacing.md }}>
            <ProgressBar progress={placement.sessionsCompleted / placement.sessionsNeeded} tintColor={colors.accent} />
            <ThemedText variant="footnote" weight="700" color="accent" style={{ textAlign: 'center' }}>
              {t.rang.placementProgress(placement.sessionsCompleted, placement.sessionsNeeded)}
            </ThemedText>
          </View>

          <ThemedText variant="footnote" color="secondary" style={{ textAlign: 'center' }}>
            {t.rang.placementHint}
          </ThemedText>
        </Card>
      ) : (
        <Card style={{ alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xl, overflow: 'hidden' }}>
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: -90,
              width: 320,
              height: 320,
              borderRadius: 160,
              backgroundColor: rankColor + '1A',
            }}
          />
          <RankEmblem rank={state.rank} size={120} />
          <ThemedText variant="title1" style={{ marginTop: Spacing.sm, color: rankColor }}>
            {state.rank} {state.division}
          </ThemedText>
          <View
            style={{
              paddingHorizontal: Spacing.md,
              paddingVertical: 4,
              borderRadius: Radius.pill,
              backgroundColor: colors.fill,
            }}
          >
            <ThemedText variant="footnote" weight="700" color="secondary">
              {t.rang.seasonLabel(ranking.seasonInfo.seasonNumber)} · {ranking.totalPoints} pts
            </ThemedText>
          </View>

          <View style={{ width: '100%', gap: 8, marginTop: Spacing.md }}>
            {state.isMaxTier ? (
              <ThemedText variant="footnote" color="accent" weight="700" style={{ textAlign: 'center' }}>
                {t.rang.maxRankReached}
              </ThemedText>
            ) : (
              <>
                <ProgressBar progress={state.pointsInDivision / POINTS_PER_DIVISION} tintColor={rankColor} height={12} />
                <ThemedText variant="footnote" color="secondary" style={{ textAlign: 'center' }}>
                  {t.rang.pointsToNextDivision(state.pointsInDivision, POINTS_PER_DIVISION)}
                </ThemedText>
              </>
            )}
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.xs }}>
            <Ionicons name="time-outline" size={14} color={colors.textTertiary} />
            <ThemedText variant="footnote" color="tertiary">
              {t.rang.newSeasonIn(daysUntilNextSeason())}
            </ThemedText>
          </View>
        </Card>
      )}

      <PlacementReveal
        visible={showReveal}
        rank={state.rank}
        rankLabel={`${state.rank} ${state.division}`}
        rankColor={rankColor}
        bonusPoints={ranking.breakdown.carryover}
        onDone={() => setShowReveal(false)}
      />

      {!inPlacement && (
        <Section title={t.rang.breakdownTitle}>
          <View style={{ gap: Spacing.sm }}>
            <SkillBanner icon="flame" label={t.skills.streak} points={ranking.breakdown.streak} />
            <SkillBanner icon="barbell" label={t.skills.pr} points={ranking.breakdown.pr} />
            <SkillBanner icon="nutrition" label={t.skills.nutrition} points={ranking.breakdown.nutrition} />
            <SkillBanner icon="calendar" label={t.skills.frequency} points={ranking.breakdown.frequency} />
            {ranking.breakdown.carryover > 0 && (
              <SkillBanner icon="arrow-redo" label={t.skills.carryover} points={ranking.breakdown.carryover} />
            )}
            {user?.measurementsEnabled && (
              <SkillBanner icon="body" label={t.skills.measurement} points={ranking.breakdown.measurement} />
            )}
          </View>
        </Section>
      )}

      <Section title={t.rang.ranksListTitle}>
        <ScrollView
          ref={ladderRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: Spacing.sm, paddingVertical: 4 }}
          style={{ marginHorizontal: -Spacing.lg }}
        >
          <View style={{ width: Spacing.lg - Spacing.sm }} />
          {RANKS.map((rank, i) => {
            const isCurrent = !inPlacement && rank === state.rank;
            const reached = !inPlacement && i <= currentRankIndex;
            const threshold = i * DIVISIONS.length * POINTS_PER_DIVISION;
            return (
              <View
                key={rank}
                style={{
                  width: LADDER_ITEM_WIDTH - Spacing.sm,
                  alignItems: 'center',
                  gap: 6,
                  paddingVertical: Spacing.md,
                  borderRadius: Radius.lg,
                  backgroundColor: isCurrent ? RANK_COLORS[rank] + '1F' : colors.card,
                  borderWidth: isCurrent ? 2 : 1,
                  borderColor: isCurrent ? RANK_COLORS[rank] : colors.border,
                }}
              >
                <RankEmblem rank={rank} size={48} locked={!reached} />
                <ThemedText
                  variant="caption"
                  weight={isCurrent ? '800' : '600'}
                  color={reached ? 'primary' : 'tertiary'}
                  numberOfLines={1}
                  style={{ textAlign: 'center', paddingHorizontal: 4 }}
                >
                  {rank}
                </ThemedText>
                <ThemedText variant="caption" color="tertiary" style={{ fontSize: 10 }}>
                  {threshold} pts
                </ThemedText>
              </View>
            );
          })}
          <View style={{ width: Spacing.lg - Spacing.sm }} />
        </ScrollView>
      </Section>

      <Section title={t.rang.seasonHistory}>
        <Card>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.lg }}>
            {seasonMedals.map((medal, i) => (
              <Pressable
                key={medal.seasonInfo.seasonNumber}
                onPress={() => setSelectedMedal({ medal, isCurrent: i === 0 })}
                style={{ alignItems: 'center', gap: 4, width: 92 }}
              >
                <SeasonMedalBadge medal={medal} size={84} />
                <ThemedText variant="caption" weight="700" color={medal.isComplete ? 'secondary' : 'accent'}>
                  {medal.isComplete ? t.rang.completed : t.rang.inProgress}
                </ThemedText>
              </Pressable>
            ))}
          </ScrollView>
        </Card>
      </Section>

      <Popup
        title={selectedMedal ? t.rang.seasonLabel(selectedMedal.medal.seasonInfo.seasonNumber) : ''}
        visible={!!selectedMedal}
        onClose={() => setSelectedMedal(null)}
      >
        {selectedMedal && (
          <View style={{ gap: Spacing.sm }}>
            <View style={{ alignItems: 'center' }}>
              <SeasonMedalBadge medal={selectedMedal.medal} size={110} />
            </View>
            <ThemedText weight="600" style={{ textAlign: 'center' }}>
              {t.rang.peakRank}{' '}
              <ThemedText weight="800" style={{ color: RANK_COLORS[selectedMedal.medal.peakRank] }}>
                {selectedMedal.medal.peakRank}
              </ThemedText>
            </ThemedText>
            {selectedStats && (
              <ThemedText color="secondary" style={{ textAlign: 'center' }}>
                {t.rang.totalPointsSummary(
                  selectedStats.totalPoints,
                  formatPoints(selectedStats.breakdown.streak),
                  formatPoints(selectedStats.breakdown.pr),
                  formatPoints(selectedStats.breakdown.nutrition)
                )}
              </ThemedText>
            )}
            <View style={{ gap: 4 }}>
              {selectedMedal.medal.segments.map((rank, i) => (
                <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 }}>
                  <ThemedText color="secondary">{monthLabelForSegment(selectedMedal.medal, i, locale)}</ThemedText>
                  <ThemedText weight="700" style={{ color: rank ? RANK_COLORS[rank] : colors.textTertiary }}>
                    {rank ?? '—'}
                  </ThemedText>
                </View>
              ))}
            </View>
          </View>
        )}
      </Popup>
    </View>
  );
}
