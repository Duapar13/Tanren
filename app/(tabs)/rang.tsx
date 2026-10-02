import { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '../../components/ScreenHeader';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { Card } from '../../components/Card';
import { ProgressBar } from '../../components/ProgressBar';
import { SkillBanner } from '../../components/SkillBanner';
import { Popup } from '../../components/Popup';
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
  RANK_ICON_IMAGES,
  RANKS,
  type SeasonMedal,
  type SeasonRanking,
} from '../../utils/ranking';
import { computeBadgeStatuses, type BadgeProgress, type BadgeStatus } from '../../utils/badges';
import { toDateKey, todayKey } from '../../utils/date';
import { hasShownPlacementReveal, markPlacementRevealShown } from '../../utils/placementReveal';
import { apiFetch } from '../../lib/api';
import { TranslationDict } from '../../constants/i18n/fr';

const BADGES_PER_PAGE = 4;
const RANKS_PER_PAGE = 4;

// Tier badges (one per rank+division, e.g. "Acier III") are generated from RANKS/DIVISIONS
// rather than hand-authored per language — so their description reuses the already-translated
// pointsThreshold copy instead of needing 47 x 4 translated strings kept in sync with the ladder.
function badgeDescription(status: BadgeStatus, t: TranslationDict): string {
  if (status.badge.id.startsWith('tier-') && status.progress.kind !== 'rank') {
    return t.rang.pointsThreshold(status.progress.target);
  }
  return t.badges[status.badge.id as keyof typeof t.badges]?.description ?? status.badge.description;
}

function formatBadgeProgress(progress: BadgeProgress, t: TranslationDict): string {
  if (progress.kind === 'rank') {
    return progress.unlocked ? t.rang.unlocked : t.rang.currentRank(progress.rank);
  }
  const suffix = progress.kind === 'kg' ? ' kg' : progress.kind === 'days' ? ` ${t.rang.daysUnit}` : '';
  return `${progress.current}/${progress.target}${suffix}`;
}

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

  const [selectedBadge, setSelectedBadge] = useState<BadgeStatus | null>(null);
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
  const badgeStatuses = useMemo(() => computeBadgeStatuses(rankingParams), [rankingParams]);
  const badgePages = useMemo(() => {
    const pages: BadgeStatus[][] = [];
    for (let i = 0; i < badgeStatuses.length; i += BADGES_PER_PAGE) {
      pages.push(badgeStatuses.slice(i, i + BADGES_PER_PAGE));
    }
    return pages;
  }, [badgeStatuses]);
  const [badgePageIndex, setBadgePageIndex] = useState(0);
  const { width: windowWidth } = useWindowDimensions();
  const badgePageWidth = windowWidth - Spacing.lg * 2;

  const rankPages = useMemo(() => {
    const pages: (typeof RANKS[number])[][] = [];
    for (let i = 0; i < RANKS.length; i += RANKS_PER_PAGE) {
      pages.push(RANKS.slice(i, i + RANKS_PER_PAGE) as (typeof RANKS[number])[]);
    }
    return pages;
  }, []);
  const [rankPageIndex, setRankPageIndex] = useState(0);

  const { state } = ranking;
  const rankColor = RANK_COLORS[state.rank];
  const placement = useMemo(
    () => computePlacementStatus(rankingParams, ranking.seasonInfo),
    [rankingParams, ranking.seasonInfo]
  );

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

  // Ranking has no server-side scoring engine — this just reports what this device already
  // computed for itself, so the leaderboard is only as fresh as each player's last report.
  useEffect(() => {
    apiFetch('/leaderboard/report', {
      method: 'POST',
      body: JSON.stringify({ seasonNumber: ranking.seasonInfo.seasonNumber }),
    }).catch(() => {});
    // Only the trigger to recompute needs to fire on real changes — the server derives the
    // actual points/rank/division itself from synced data, ignoring anything the client sends.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ranking.seasonInfo.seasonNumber, ranking.totalPoints, state.rank, state.division]);

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [myEntry, setMyEntry] = useState<MyLeaderboardEntry | null>(null);
  useFocusEffect(
    useCallback(() => {
      apiFetch(`/leaderboard?seasonNumber=${ranking.seasonInfo.seasonNumber}`)
        .then((res: { entries: LeaderboardEntry[]; me: MyLeaderboardEntry | null }) => {
          setLeaderboard(res.entries);
          setMyEntry(res.me);
        })
        .catch(() => {});
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ranking.seasonInfo.seasonNumber])
  );

  const showPinnedMe = !!myEntry && !leaderboard.some((e) => e.userId === myEntry.userId);

  const selectedStats: SeasonRanking | null = useMemo(() => {
    if (!selectedMedal) return null;
    if (selectedMedal.isCurrent) return ranking;
    return computeSeasonRanking(rankingParams, selectedMedal.medal.seasonInfo);
  }, [selectedMedal, ranking, rankingParams]);

  return (
    <ThemedView variant="grouped" style={{ flex: 1 }}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScreenHeader mascot="proud" />
        <ScrollView
          contentContainerStyle={{
            padding: Spacing.lg,
            gap: Spacing.lg,
            paddingBottom: Spacing.xxl,
          }}
        >
          {placement.applicable && placement.inPlacement ? (
            <Card style={{ alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xl }}>
              <View
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: 999,
                  backgroundColor: colors.accent + '1A',
                  borderWidth: 2,
                  borderColor: colors.accent,
                  borderStyle: 'dashed',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="help" size={44} color={colors.accent} />
              </View>
              <ThemedText variant="title1" weight="700">
                {t.rang.placementTitle}
              </ThemedText>
              <ThemedText variant="subhead" color="secondary">
                {t.rang.seasonLabel(ranking.seasonInfo.seasonNumber)}
              </ThemedText>

              <View style={{ width: '100%', gap: 6, marginTop: Spacing.sm }}>
                <ProgressBar
                  progress={placement.sessionsCompleted / placement.sessionsNeeded}
                  tintColor={colors.accent}
                />
                <ThemedText variant="caption" color="tertiary" style={{ textAlign: 'center' }}>
                  {t.rang.placementProgress(placement.sessionsCompleted, placement.sessionsNeeded)}
                </ThemedText>
              </View>

              <ThemedText variant="caption" color="tertiary" style={{ textAlign: 'center', marginTop: Spacing.xs }}>
                {t.rang.placementHint}
              </ThemedText>
            </Card>
          ) : (
            <Card style={{ alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xl }}>
              <View
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: 999,
                  backgroundColor: rankColor + '26',
                  borderWidth: 2,
                  borderColor: rankColor,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Image source={RANK_ICON_IMAGES[state.rank]} style={{ width: 44, height: 44, tintColor: rankColor }} />
              </View>
              <ThemedText variant="title1" weight="700">
                {state.rank} {state.division}
              </ThemedText>
              <ThemedText variant="subhead" color="secondary">
                {t.rang.seasonLabel(ranking.seasonInfo.seasonNumber)}
              </ThemedText>

              <View style={{ width: '100%', gap: 6, marginTop: Spacing.sm }}>
                {state.isMaxTier ? (
                  <ThemedText variant="footnote" color="accent" weight="600" style={{ textAlign: 'center' }}>
                    {t.rang.maxRankReached}
                  </ThemedText>
                ) : (
                  <>
                    <ProgressBar progress={state.pointsInDivision / POINTS_PER_DIVISION} tintColor={rankColor} />
                    <ThemedText variant="caption" color="tertiary" style={{ textAlign: 'center' }}>
                      {t.rang.pointsToNextDivision(state.pointsInDivision, POINTS_PER_DIVISION)}
                    </ThemedText>
                  </>
                )}
              </View>

              <ThemedText variant="caption" color="tertiary">
                {t.rang.newSeasonIn(daysUntilNextSeason())}
              </ThemedText>
            </Card>
          )}

          <PlacementReveal
            visible={showReveal}
            rankLabel={`${state.rank} ${state.division}`}
            rankColor={rankColor}
            rankIcon={RANK_ICON_IMAGES[state.rank]}
            bonusPoints={ranking.breakdown.carryover}
            onDone={() => setShowReveal(false)}
          />

          <View>
            <ThemedText variant="headline" style={{ marginBottom: Spacing.sm }}>
              {t.rang.ranksListTitle}
            </ThemedText>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              scrollEventThrottle={16}
              onScroll={(e) => {
                setRankPageIndex(Math.round(e.nativeEvent.contentOffset.x / badgePageWidth));
              }}
            >
              {rankPages.map((page, pageIndex) => (
                <Card key={pageIndex} style={{ width: badgePageWidth, flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md }}>
                  {page.map((rank, indexInPage) => {
                    const i = pageIndex * RANKS_PER_PAGE + indexInPage;
                    const isCurrent = rank === state.rank;
                    const threshold = i * DIVISIONS.length * POINTS_PER_DIVISION;
                    return (
                      <View key={rank} style={{ width: '45%', alignItems: 'center', gap: 4 }}>
                        <View
                          style={{
                            width: 52,
                            height: 52,
                            borderRadius: 999,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: RANK_COLORS[rank] + '26',
                            borderWidth: isCurrent ? 3 : 2,
                            borderColor: RANK_COLORS[rank],
                          }}
                        >
                          <Image source={RANK_ICON_IMAGES[rank]} style={{ width: 24, height: 24, tintColor: RANK_COLORS[rank] }} />
                        </View>
                        <ThemedText
                          variant="caption"
                          weight={isCurrent ? '700' : '600'}
                          style={{ textAlign: 'center' }}
                        >
                          {rank}
                        </ThemedText>
                        <ThemedText variant="caption" color="tertiary" style={{ textAlign: 'center' }}>
                          {t.rang.pointsThreshold(threshold)}
                        </ThemedText>
                        {isCurrent && <Ionicons name="checkmark-circle" size={16} color={colors.accent} />}
                      </View>
                    );
                  })}
                </Card>
              ))}
            </ScrollView>
            {rankPages.length > 1 && (
              <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: Spacing.sm }}>
                {rankPages.map((_, i) => (
                  <View
                    key={i}
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: i === rankPageIndex ? colors.accent : colors.separator,
                    }}
                  />
                ))}
              </View>
            )}
          </View>

          {!(placement.applicable && placement.inPlacement) && (
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
          )}

          <View>
            <ThemedText variant="headline" style={{ marginBottom: Spacing.sm }}>
              {t.rang.badges}
            </ThemedText>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              scrollEventThrottle={16}
              onScroll={(e) => {
                setBadgePageIndex(Math.round(e.nativeEvent.contentOffset.x / badgePageWidth));
              }}
            >
              {badgePages.map((page, pageIndex) => (
                <Card key={pageIndex} style={{ width: badgePageWidth, flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md }}>
                  {page.map((status) => {
                    const { badge, unlocked } = status;
                    const label = t.badges[badge.id as keyof typeof t.badges]?.name ?? badge.name;
                    return (
                      <Pressable
                        key={badge.id}
                        onPress={() => setSelectedBadge(status)}
                        style={{ width: '45%', alignItems: 'center', gap: 6 }}
                      >
                        <View
                          style={{
                            width: 56,
                            height: 56,
                            borderRadius: 999,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: unlocked ? colors.accent + '26' : colors.fill,
                            borderWidth: 2,
                            borderColor: unlocked ? colors.accent : colors.separator,
                          }}
                        >
                          {badge.rank ? (
                            <Image
                              source={RANK_ICON_IMAGES[badge.rank]}
                              style={{
                                width: 26,
                                height: 26,
                                tintColor: unlocked ? colors.accent : colors.textTertiary,
                              }}
                            />
                          ) : (
                            <Ionicons name={badge.icon} size={26} color={unlocked ? colors.accent : colors.textTertiary} />
                          )}
                        </View>
                        <ThemedText
                          variant="caption"
                          weight="600"
                          color={unlocked ? 'primary' : 'tertiary'}
                          style={{ textAlign: 'center' }}
                        >
                          {label}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </Card>
              ))}
            </ScrollView>
            {badgePages.length > 1 && (
              <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: Spacing.sm }}>
                {badgePages.map((_, i) => (
                  <View
                    key={i}
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: i === badgePageIndex ? colors.accent : colors.separator,
                    }}
                  />
                ))}
              </View>
            )}
          </View>

          <View>
            <ThemedText variant="headline" style={{ marginBottom: Spacing.sm }}>
              {t.rang.globalLeaderboard}
            </ThemedText>
            {leaderboard.length === 0 ? (
              <Card>
                <ThemedText color="secondary" style={{ textAlign: 'center' }}>
                  {t.rang.noScoreYet}
                </ThemedText>
              </Card>
            ) : (
              <Card style={{ gap: 0 }}>
                {leaderboard.map((entry, i) => {
                  const isMe = entry.userId === user?.id;
                  return (
                    <View
                      key={entry.userId}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: Spacing.sm,
                        paddingVertical: Spacing.xs,
                        borderTopWidth: i === 0 ? 0 : 1,
                        borderTopColor: colors.separator,
                        backgroundColor: isMe ? colors.accent + '14' : 'transparent',
                        marginHorizontal: isMe ? -Spacing.md : 0,
                        paddingHorizontal: isMe ? Spacing.md : 0,
                        borderRadius: isMe ? 8 : 0,
                      }}
                    >
                      <ThemedText variant="subhead" weight="700" color="tertiary" style={{ width: 24 }}>
                        {i + 1}
                      </ThemedText>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <ThemedText variant="subhead" weight={isMe ? '700' : '400'} numberOfLines={1}>
                          {entry.displayName ?? entry.username}
                        </ThemedText>
                        <ThemedText variant="caption" color="tertiary">
                          {entry.inPlacement ? t.rang.placementTitle : `${entry.rank} ${entry.division}`}
                        </ThemedText>
                      </View>
                      <ThemedText variant="subhead" weight="700">
                        {entry.inPlacement ? '—' : `${entry.points} pts`}
                      </ThemedText>
                    </View>
                  );
                })}
              </Card>
            )}
            {showPinnedMe && myEntry && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: Spacing.sm,
                  marginTop: Spacing.sm,
                  padding: Spacing.md,
                  borderRadius: Radius.md,
                  backgroundColor: colors.accent + '14',
                  borderWidth: 1,
                  borderColor: colors.accent + '40',
                }}
              >
                <ThemedText variant="subhead" weight="700" color="accent" style={{ width: 32 }}>
                  #{myEntry.position}
                </ThemedText>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <ThemedText variant="subhead" weight="700" numberOfLines={1}>
                    {myEntry.displayName ?? myEntry.username}
                  </ThemedText>
                  <ThemedText variant="caption" color="tertiary">
                    {myEntry.inPlacement ? t.rang.placementTitle : `${myEntry.rank} ${myEntry.division}`}
                  </ThemedText>
                </View>
                <ThemedText variant="subhead" weight="700">
                  {myEntry.inPlacement ? '—' : `${myEntry.points} pts`}
                </ThemedText>
              </View>
            )}
          </View>

          <View>
            <ThemedText variant="headline" style={{ marginBottom: Spacing.sm }}>
              {t.rang.seasonHistory}
            </ThemedText>
            <Card>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.lg }}>
                {seasonMedals.map((medal, i) => (
                  <Pressable
                    key={medal.seasonInfo.seasonNumber}
                    onPress={() => setSelectedMedal({ medal, isCurrent: i === 0 })}
                    style={{ alignItems: 'center', gap: 4, width: 92 }}
                  >
                    <SeasonMedalBadge medal={medal} size={84} />
                    <ThemedText variant="caption" weight="600" color={medal.isComplete ? 'secondary' : 'accent'}>
                      {medal.isComplete ? t.rang.completed : t.rang.inProgress}
                    </ThemedText>
                  </Pressable>
                ))}
              </ScrollView>
            </Card>
          </View>

        </ScrollView>

        <Popup
          title={selectedBadge ? t.badges[selectedBadge.badge.id as keyof typeof t.badges]?.name ?? selectedBadge.badge.name : ''}
          visible={!!selectedBadge}
          onClose={() => setSelectedBadge(null)}
        >
          {selectedBadge && (
            <View style={{ gap: Spacing.sm }}>
              <ThemedText color="secondary" style={{ textAlign: 'center' }}>
                {badgeDescription(selectedBadge, t)}
              </ThemedText>
              <ThemedText weight="600" style={{ textAlign: 'center' }}>
                {formatBadgeProgress(selectedBadge.progress, t)}
              </ThemedText>
            </View>
          )}
        </Popup>

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
                <ThemedText weight="700" style={{ color: RANK_COLORS[selectedMedal.medal.peakRank] }}>
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
                  <View
                    key={i}
                    style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 }}
                  >
                    <ThemedText color="secondary">{monthLabelForSegment(selectedMedal.medal, i, locale)}</ThemedText>
                    <ThemedText weight="600" style={{ color: rank ? RANK_COLORS[rank] : colors.textTertiary }}>
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
