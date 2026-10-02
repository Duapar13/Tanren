import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '../../components/ScreenHeader';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { Card } from '../../components/Card';
import { Section } from '../../components/Section';
import { ProgressBar } from '../../components/ProgressBar';
import { SkillBanner } from '../../components/SkillBanner';
import { Popup } from '../../components/Popup';
import { RankEmblem } from '../../components/RankEmblem';
import { SeasonMedalBadge } from '../../components/SeasonMedalBadge';
import { PlacementReveal } from '../../components/PlacementReveal';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../hooks/useTheme';
import { LOCALE_MAP, useTranslation } from '../../hooks/useTranslation';
import { Radius, Spacing } from '../../constants/theme';
import {
  computeSeasonMedalHistory,
  computeSeasonRanking,
  daysUntilNextSeason,
  computePlacementStatus,
  DIVISIONS,
  POINTS_PER_DIVISION,
  RANK_COLORS,
  RANKS,
  type RankName,
  type SeasonMedal,
  type SeasonRanking,
} from '../../utils/ranking';
import { toDateKey, todayKey } from '../../utils/date';
import { hasShownPlacementReveal, markPlacementRevealShown } from '../../utils/placementReveal';
import { usePreference } from '../../lib/preferences';
import { apiFetch } from '../../lib/api';

const LADDER_ITEM_WIDTH = 88;

interface LeaderboardEntry {
  userId: number;
  username: string;
  displayName: string | null;
  points: number | null;
  rank: string | null;
  division: string | null;
  inPlacement: boolean;
}

interface MyLeaderboardEntry extends LeaderboardEntry {
  position: number;
}

function formatPoints(points: number): string {
  return `${points >= 0 ? '+' : ''}${points} pt${Math.abs(points) > 1 ? 's' : ''}`;
}

function monthLabelForSegment(medal: SeasonMedal, index: number, locale: string): string {
  const start = new Date(`${medal.seasonInfo.startDate}T00:00:00`);
  const d = new Date(start.getFullYear(), start.getMonth() + index, 1);
  const label = d.toLocaleDateString(locale, { month: 'long' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function asRankName(rank: string | null): RankName | null {
  return rank && (RANKS as readonly string[]).includes(rank) ? (rank as RankName) : null;
}

interface MedalSelection {
  medal: SeasonMedal;
  isCurrent: boolean;
}

export default function RangScreen() {
  const { sessions, sets, nutritionEntries, bodyWeightEntries, measurementEntries, exercises } = useData();
  const { user } = useAuth();
  const { colors } = useTheme();
  const { t, lang } = useTranslation();
  const locale = LOCALE_MAP[lang];
  const showLeaderboard = usePreference('showLeaderboard');

  const [selectedMedal, setSelectedMedal] = useState<MedalSelection | null>(null);

  const rankingParams = useMemo(
    () => ({
      sessions,
      sets,
      nutritionEntries,
      bodyWeightEntries,
      measurementEntries,
      exercises,
      measurementsEnabled: user?.measurementsEnabled ?? false,
      trainingDays: user?.trainingDays ?? [],
      goal: user?.goal ?? ('maintain' as const),
      accountCreatedAt: user?.createdAt ? toDateKey(new Date(user.createdAt)) : todayKey(),
    }),
    [sessions, sets, nutritionEntries, bodyWeightEntries, measurementEntries, exercises, user]
  );

  const ranking = useMemo(() => computeSeasonRanking(rankingParams), [rankingParams]);
  const seasonMedals = useMemo(() => computeSeasonMedalHistory(rankingParams), [rankingParams]);

  const { state } = ranking;
  const rankColor = RANK_COLORS[state.rank];
  const currentRankIndex = RANKS.indexOf(state.rank);
  const placement = useMemo(
    () => computePlacementStatus(rankingParams, ranking.seasonInfo),
    [rankingParams, ranking.seasonInfo]
  );
  const inPlacement = placement.applicable && placement.inPlacement;

  const ladderRef = useRef<ScrollView>(null);
  useEffect(() => {
    // Land the ladder on the player's current rank instead of always starting at Fer.
    const x = Math.max(0, currentRankIndex * LADDER_ITEM_WIDTH - LADDER_ITEM_WIDTH);
    const id = setTimeout(() => ladderRef.current?.scrollTo({ x, animated: false }), 50);
    return () => clearTimeout(id);
  }, [currentRankIndex]);

  // Fires once, the first time this screen notices placement just finished (sessionsCompleted
  // reached sessionsNeeded) — hasShownPlacementReveal guards against replaying it on every later
  // visit to this tab once the season's already placed.
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

  // The server recomputes the score itself from synced data — this is just the trigger. It keeps
  // firing even when the leaderboard is hidden locally, so the player stays ranked for others.
  useEffect(() => {
    apiFetch('/leaderboard/report', {
      method: 'POST',
      body: JSON.stringify({ seasonNumber: ranking.seasonInfo.seasonNumber }),
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ranking.seasonInfo.seasonNumber, ranking.totalPoints, state.rank, state.division]);

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [myEntry, setMyEntry] = useState<MyLeaderboardEntry | null>(null);
  useFocusEffect(
    useCallback(() => {
      if (!showLeaderboard) return;
      apiFetch(`/leaderboard?seasonNumber=${ranking.seasonInfo.seasonNumber}`)
        .then((res: { entries: LeaderboardEntry[]; me: MyLeaderboardEntry | null }) => {
          setLeaderboard(res.entries);
          setMyEntry(res.me);
        })
        .catch(() => {});
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ranking.seasonInfo.seasonNumber, showLeaderboard])
  );

  const showPinnedMe = !!myEntry && !leaderboard.some((e) => e.userId === myEntry.userId);

  const selectedStats: SeasonRanking | null = useMemo(() => {
    if (!selectedMedal) return null;
    if (selectedMedal.isCurrent) return ranking;
    return computeSeasonRanking(rankingParams, selectedMedal.medal.seasonInfo);
  }, [selectedMedal, ranking, rankingParams]);

  const renderLeaderboardRow = (entry: LeaderboardEntry, position: number, pinned = false) => {
    const isMe = entry.userId === user?.id;
    const rank = entry.inPlacement ? null : asRankName(entry.rank);
    const topColor = position === 1 ? '#F5C542' : position === 2 ? '#B8BEC9' : position === 3 ? '#C98A5A' : null;
    return (
      <View
        key={`${pinned ? 'me-' : ''}${entry.userId}`}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: Spacing.md,
          paddingVertical: Spacing.sm,
          paddingHorizontal: Spacing.md,
          borderRadius: Radius.md,
          backgroundColor: isMe ? colors.accentSoft : 'transparent',
          borderWidth: isMe ? 1 : 0,
          borderColor: colors.accent + '4D',
        }}
      >
        <View style={{ width: 30, alignItems: 'center' }}>
          {topColor ? (
            <Ionicons name="trophy" size={20} color={topColor} />
          ) : (
            <ThemedText variant="subhead" weight="700" color={isMe ? 'accent' : 'tertiary'}>
              {pinned ? `#${position}` : position}
            </ThemedText>
          )}
        </View>
        <RankEmblem rank={rank} size={38} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <ThemedText variant="subhead" weight={isMe ? '700' : '600'} numberOfLines={1}>
            {entry.displayName ?? entry.username}
          </ThemedText>
          <ThemedText variant="caption" color="tertiary">
            {entry.inPlacement ? t.rang.placementTitle : `${entry.rank} ${entry.division}`}
          </ThemedText>
        </View>
        <ThemedText variant="subhead" weight="800">
          {entry.inPlacement ? '—' : `${entry.points} pts`}
        </ThemedText>
      </View>
    );
  };

  return (
    <ThemedView variant="grouped" style={{ flex: 1 }}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScreenHeader title={t.tabs.rank} mascot="proud" />
        <ScrollView
          contentContainerStyle={{
            padding: Spacing.lg,
            gap: Spacing.xl,
            paddingBottom: Spacing.xxl * 2,
          }}
          showsVerticalScrollIndicator={false}
        >
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

              <ThemedText variant="caption" color="secondary" style={{ textAlign: 'center' }}>
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
                <ThemedText variant="caption" weight="700" color="secondary">
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
                    <ThemedText variant="caption" color="secondary" style={{ textAlign: 'center' }}>
                      {t.rang.pointsToNextDivision(state.pointsInDivision, POINTS_PER_DIVISION)}
                    </ThemedText>
                  </>
                )}
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.xs }}>
                <Ionicons name="time-outline" size={14} color={colors.textTertiary} />
                <ThemedText variant="caption" color="tertiary">
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
              contentInset={{ left: Spacing.lg, right: Spacing.lg }}
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

          {showLeaderboard && (
            <Section title={t.rang.globalLeaderboard}>
              {leaderboard.length === 0 ? (
                <Card>
                  <ThemedText color="secondary" style={{ textAlign: 'center' }}>
                    {t.rang.noScoreYet}
                  </ThemedText>
                </Card>
              ) : (
                <Card style={{ gap: 2, padding: Spacing.sm }}>
                  {leaderboard.map((entry, i) => renderLeaderboardRow(entry, i + 1))}
                </Card>
              )}
              {showPinnedMe && myEntry && (
                <Card variant="accent" style={{ padding: Spacing.sm }}>
                  {renderLeaderboardRow(myEntry, myEntry.position, true)}
                </Card>
              )}
            </Section>
          )}

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
        </ScrollView>

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
      </SafeAreaView>
    </ThemedView>
  );
}
