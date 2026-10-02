import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '../ThemedText';
import { Card } from '../Card';
import { Button } from '../Button';
import { Section } from '../Section';
import { EmptyState } from '../EmptyState';
import { NavRow } from '../SettingRow';
import { RankEmblem } from '../RankEmblem';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../hooks/useTheme';
import { useRanking } from '../../hooks/useRanking';
import { useTranslation } from '../../hooks/useTranslation';
import { Radius, Spacing } from '../../constants/theme';
import { RANKS, type RankName } from '../../utils/ranking';
import { apiFetch } from '../../lib/api';
import { setPreference, usePreference } from '../../lib/preferences';

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

function asRankName(rank: string | null): RankName | null {
  return rank && (RANKS as readonly string[]).includes(rank) ? (rank as RankName) : null;
}

/** Global leaderboard (can be hidden from Profile) and the entry point to friends. */
export function SocialView() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { ranking } = useRanking();
  const showLeaderboard = usePreference('showLeaderboard');
  const seasonNumber = ranking.seasonInfo.seasonNumber;

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [myEntry, setMyEntry] = useState<MyLeaderboardEntry | null>(null);
  const [failed, setFailed] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!showLeaderboard) return;
      apiFetch(`/leaderboard?seasonNumber=${seasonNumber}`)
        .then((res: { entries: LeaderboardEntry[]; me: MyLeaderboardEntry | null }) => {
          setLeaderboard(res.entries);
          setMyEntry(res.me);
          setFailed(false);
        })
        .catch(() => setFailed(true));
    }, [seasonNumber, showLeaderboard])
  );

  const showPinnedMe = !!myEntry && !leaderboard.some((e) => e.userId === myEntry.userId);

  const renderRow = (entry: LeaderboardEntry, position: number, pinned = false) => {
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
          <ThemedText variant="footnote" color="tertiary">
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
    <View style={{ gap: Spacing.xl }}>
      <NavRow icon="people-outline" label={t.profil.friends} onPress={() => router.push('/friends')} />

      {showLeaderboard ? (
        <Section title={t.rang.globalLeaderboard}>
          {leaderboard.length === 0 ? (
            <Card>
              <EmptyState
                icon={failed ? 'cloud-offline-outline' : 'trophy-outline'}
                text={failed ? t.sync.requiresInternet : t.rang.noScoreYet}
              />
            </Card>
          ) : (
            <Card style={{ gap: 2, padding: Spacing.sm }}>
              {leaderboard.map((entry, i) => renderRow(entry, i + 1))}
            </Card>
          )}
          {showPinnedMe && myEntry && (
            <Card variant="accent" style={{ padding: Spacing.sm }}>
              {renderRow(myEntry, myEntry.position, true)}
            </Card>
          )}
        </Section>
      ) : (
        <Card style={{ gap: Spacing.md, alignItems: 'center' }}>
          <Ionicons name="eye-off-outline" size={28} color={colors.textTertiary} />
          <ThemedText color="secondary" style={{ textAlign: 'center' }}>
            {t.profil.leaderboardHidden}
          </ThemedText>
          <Button
            title={t.profil.showLeaderboard}
            variant="tonal"
            onPress={() => setPreference('showLeaderboard', true)}
          />
        </Card>
      )}
    </View>
  );
}
