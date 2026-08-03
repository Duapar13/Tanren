import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '../../components/ScreenHeader';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { Card } from '../../components/Card';
import { ProgressBar } from '../../components/ProgressBar';
import { SkillBanner } from '../../components/SkillBanner';
import { XPBadge } from '../../components/XPBadge';
import { Popup } from '../../components/Popup';
import { SeasonMedalBadge } from '../../components/SeasonMedalBadge';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../hooks/useTheme';
import { LOCALE_MAP, useTranslation } from '../../hooks/useTranslation';
import { Spacing } from '../../constants/theme';
import {
  computeSeasonMedalHistory,
  computeSeasonRanking,
  daysUntilNextSeason,
  POINTS_PER_DIVISION,
  RANK_COLORS,
  type SeasonMedal,
  type SeasonRanking,
} from '../../utils/ranking';
import { computeBadgeStatuses, type BadgeProgress, type BadgeStatus } from '../../utils/badges';
import { toDateKey, todayKey } from '../../utils/date';
import { apiFetch } from '../../lib/api';
import { TranslationDict } from '../../constants/i18n/fr';

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
  points: number;
  rank: string;
  division: string;
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
  const { sessions, sets, nutritionEntries, bodyWeightEntries, measurementEntries } = useData();
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
      measurementsEnabled: user?.measurementsEnabled ?? false,
      trainingDays: user?.trainingDays ?? [],
      goal: user?.goal ?? ('maintain' as const),
      accountCreatedAt: user?.createdAt ? toDateKey(new Date(user.createdAt)) : todayKey(),
    }),
    [sessions, sets, nutritionEntries, bodyWeightEntries, measurementEntries, user]
  );

  const ranking = useMemo(() => computeSeasonRanking(rankingParams), [rankingParams]);
  const seasonMedals = useMemo(() => computeSeasonMedalHistory(rankingParams), [rankingParams]);
  const badgeStatuses = useMemo(() => computeBadgeStatuses(rankingParams), [rankingParams]);

  const { state } = ranking;
  const rankColor = RANK_COLORS[state.rank];

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
  useFocusEffect(
    useCallback(() => {
      apiFetch(`/leaderboard?seasonNumber=${ranking.seasonInfo.seasonNumber}`)
        .then(setLeaderboard)
        .catch(() => {});
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ranking.seasonInfo.seasonNumber])
  );

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
              <Ionicons name="shield" size={44} color={rankColor} />
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

          <View style={{ gap: Spacing.sm }}>
            <SkillBanner icon="flame" label={t.skills.streak} points={ranking.breakdown.streak} />
            <SkillBanner icon="barbell" label={t.skills.pr} points={ranking.breakdown.pr} />
            <SkillBanner icon="nutrition" label={t.skills.nutrition} points={ranking.breakdown.nutrition} />
            {user?.measurementsEnabled && (
              <SkillBanner icon="body" label={t.skills.measurement} points={ranking.breakdown.measurement} />
            )}
          </View>

          <View>
            <ThemedText variant="headline" style={{ marginBottom: Spacing.sm }}>
              {t.rang.badges}
            </ThemedText>
            <Card style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md }}>
              {badgeStatuses.map((status) => {
                const { badge, unlocked } = status;
                const label = t.badges[badge.id as keyof typeof t.badges]?.name ?? badge.name;
                return (
                  <Pressable
                    key={badge.id}
                    onPress={() => setSelectedBadge(status)}
                    style={{ width: '22%', alignItems: 'center', gap: 6 }}
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
                      <Ionicons name={badge.icon} size={26} color={unlocked ? colors.accent : colors.textTertiary} />
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
                          {entry.rank} {entry.division}
                        </ThemedText>
                      </View>
                      <ThemedText variant="subhead" weight="700">
                        {entry.points} pts
                      </ThemedText>
                    </View>
                  );
                })}
              </Card>
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

          <View>
            <ThemedText variant="headline" style={{ marginBottom: Spacing.sm }}>
              {t.rang.seasonEventHistory}
            </ThemedText>
            {ranking.events.length === 0 ? (
              <Card>
                <ThemedText color="secondary" style={{ textAlign: 'center' }}>
                  {t.rang.noPointsYet}
                </ThemedText>
              </Card>
            ) : (
              <Card style={{ gap: 0 }}>
                {ranking.events.map((e, i) => (
                  <View
                    key={`${e.date}-${i}`}
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingVertical: Spacing.xs,
                      borderTopWidth: i === 0 ? 0 : 1,
                      borderTopColor: colors.separator,
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <ThemedText variant="subhead">{e.label}</ThemedText>
                      <ThemedText variant="caption" color="tertiary">
                        {e.date}
                      </ThemedText>
                    </View>
                    <XPBadge points={e.points} size="sm" />
                  </View>
                ))}
              </Card>
            )}
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
                {t.badges[selectedBadge.badge.id as keyof typeof t.badges]?.description ?? selectedBadge.badge.description}
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
