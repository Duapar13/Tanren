import { useCallback, useState } from 'react';
import { Alert, Image, Keyboard, Pressable, ScrollView, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '../components/ThemedText';
import { ThemedView } from '../components/ThemedView';
import { Card } from '../components/Card';
import { Section } from '../components/Section';
import { EmptyState } from '../components/EmptyState';
import { RankEmblem } from '../components/RankEmblem';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { IconButton } from '../components/IconButton';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import { Spacing, Radius } from '../constants/theme';
import { apiFetch, ApiError, API_URL } from '../lib/api';
import { RANK_COLORS, RankName } from '../utils/ranking';

interface Friend {
  userId: number;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  seasonPoints: number | null;
  seasonRank: RankName | null;
  seasonDivision: string | null;
}

interface IncomingRequest {
  id: number;
  fromUserId: number;
  fromUsername: string;
  fromDisplayName: string | null;
}

interface OutgoingRequest {
  id: number;
  toUserId: number;
  toUsername: string;
}

interface WeekStats {
  weekStart: string;
  weekEnd: string;
  me: { sessionCount: number; totalVolume: number };
  friend: { sessionCount: number; totalVolume: number };
}

function FriendAvatar({ avatarUrl, size = 40 }: { avatarUrl: string | null; size?: number }) {
  const { colors } = useTheme();
  if (avatarUrl) {
    return (
      <Image
        source={{ uri: `${API_URL}${avatarUrl}` }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.accentSoft,
        borderWidth: 1.5,
        borderColor: colors.accent + '66',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons name="person" size={size * 0.5} color={colors.accent} />
    </View>
  );
}

export default function FriendsScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const [friends, setFriends] = useState<Friend[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<IncomingRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<OutgoingRequest[]>([]);
  const [username, setUsername] = useState('');
  const [adding, setAdding] = useState(false);
  const [expandedFriendId, setExpandedFriendId] = useState<number | null>(null);
  const [weekStats, setWeekStats] = useState<Record<number, WeekStats>>({});

  const loadFriends = useCallback(() => {
    apiFetch('/friends')
      .then((res: { friends: Friend[]; incomingRequests: IncomingRequest[]; outgoingRequests: OutgoingRequest[] }) => {
        setFriends(res.friends);
        setIncomingRequests(res.incomingRequests);
        setOutgoingRequests(res.outgoingRequests);
      })
      .catch(() => {});
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadFriends();
    }, [loadFriends])
  );

  const friendErrorMessage = (err: unknown): string => {
    if (err instanceof ApiError) {
      switch (err.code) {
        case 'user_not_found':
          return t.friends.errorUserNotFound;
        case 'already_friends':
          return t.friends.errorAlreadyFriends;
        case 'request_already_sent':
          return t.friends.errorRequestAlreadySent;
        case 'cannot_friend_self':
          return t.friends.errorCannotAddSelf;
      }
    }
    return t.friends.errorUserNotFound;
  };

  const handleAddFriend = async () => {
    if (!username.trim()) return;
    Keyboard.dismiss();
    setAdding(true);
    try {
      const res: { status: 'pending' | 'accepted' } = await apiFetch('/friends/requests', {
        method: 'POST',
        body: JSON.stringify({ username: username.trim() }),
      });
      setUsername('');
      loadFriends();
      if (res.status === 'accepted') {
        Alert.alert(t.friends.friendsListTitle);
      } else {
        Alert.alert(t.friends.requestSent);
      }
    } catch (err) {
      Alert.alert(friendErrorMessage(err));
    } finally {
      setAdding(false);
    }
  };

  const handleAccept = async (id: number) => {
    await apiFetch(`/friends/requests/${id}/accept`, { method: 'POST' });
    loadFriends();
  };

  const handleDecline = async (id: number) => {
    await apiFetch(`/friends/requests/${id}`, { method: 'DELETE' });
    loadFriends();
  };

  const handleUnfriend = (friend: Friend) => {
    Alert.alert(t.friends.unfriendConfirmTitle, friend.displayName ?? friend.username, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.common.delete,
        style: 'destructive',
        onPress: async () => {
          await apiFetch(`/friends/${friend.userId}`, { method: 'DELETE' });
          loadFriends();
        },
      },
    ]);
  };

  const toggleExpand = (friendId: number) => {
    if (expandedFriendId === friendId) {
      setExpandedFriendId(null);
      return;
    }
    setExpandedFriendId(friendId);
    if (!weekStats[friendId]) {
      apiFetch(`/friends/${friendId}/week`)
        .then((res: WeekStats) => setWeekStats((prev) => ({ ...prev, [friendId]: res })))
        .catch(() => {});
    }
  };

  return (
    <ThemedView variant="grouped" style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.xl, paddingBottom: Spacing.xxl * 2 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Card variant="accent" style={{ gap: Spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
            <Ionicons name="person-add" size={18} color={colors.accent} />
            <ThemedText variant="subhead" weight="700" color="accent">
              {t.friends.addFriendPlaceholder}
            </ThemedText>
          </View>
          <Input
            placeholder={t.friends.addFriendPlaceholder}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            returnKeyType="done"
            onSubmitEditing={handleAddFriend}
          />
          <Button
            title={adding ? t.common.saving : t.common.add}
            onPress={handleAddFriend}
            disabled={adding || !username.trim()}
          />
        </Card>

        {incomingRequests.length > 0 && (
          <Section title={t.friends.incomingRequestsTitle}>
            {incomingRequests.map((req) => (
              <Card
                key={req.id}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <ThemedText variant="subhead" weight="600">
                  {req.fromDisplayName ?? req.fromUsername}
                </ThemedText>
                <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                  <Button title={t.friends.accept} onPress={() => handleAccept(req.id)} />
                  <IconButton name="close" variant="destructive" onPress={() => handleDecline(req.id)} />
                </View>
              </Card>
            ))}
          </Section>
        )}

        {outgoingRequests.length > 0 && (
          <Section title={t.friends.outgoingRequestsTitle}>
            {outgoingRequests.map((req) => (
              <Card
                key={req.id}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <ThemedText variant="subhead">{req.toUsername}</ThemedText>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                  <ThemedText variant="caption" color="tertiary">
                    {t.friends.pending}
                  </ThemedText>
                  <IconButton name="close" onPress={() => handleDecline(req.id)} />
                </View>
              </Card>
            ))}
          </Section>
        )}

        <Section title={t.friends.friendsListTitle}>
          {friends.length === 0 ? (
            <EmptyState icon="people-outline" text={t.friends.emptyState} />
          ) : (
            friends.map((friend) => {
              const expanded = expandedFriendId === friend.userId;
              const stats = weekStats[friend.userId];
              const rankColor = friend.seasonRank ? RANK_COLORS[friend.seasonRank] : colors.textTertiary;
              return (
                <Card key={friend.userId} style={{ gap: Spacing.sm }}>
                  <Pressable
                    onPress={() => toggleExpand(friend.userId)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}
                  >
                    <FriendAvatar avatarUrl={friend.avatarUrl} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <ThemedText variant="subhead" weight="600" numberOfLines={1}>
                        {friend.displayName ?? friend.username}
                      </ThemedText>
                      {friend.seasonRank && (
                        <ThemedText variant="caption" weight="700" style={{ color: rankColor }}>
                          {friend.seasonRank} {friend.seasonDivision} · {friend.seasonPoints} pts
                        </ThemedText>
                      )}
                    </View>
                    {friend.seasonRank && <RankEmblem rank={friend.seasonRank} size={36} />}
                    <IconButton
                      name="person-remove-outline"
                      variant="destructive"
                      size={18}
                      onPress={() => handleUnfriend(friend)}
                    />
                    <Ionicons
                      name={expanded ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color={colors.textTertiary}
                    />
                  </Pressable>

                  {expanded && (
                    <View
                      style={{
                        gap: Spacing.sm,
                        paddingTop: Spacing.sm,
                        borderTopWidth: 1,
                        borderTopColor: colors.separator,
                      }}
                    >
                      <ThemedText variant="caption" color="tertiary">
                        {t.friends.weekChallengeTitle}
                      </ThemedText>
                      {stats ? (
                        <View style={{ flexDirection: 'row', gap: Spacing.md }}>
                          <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
                            <ThemedText variant="footnote" weight="600" color="accent">
                              {t.friends.me}
                            </ThemedText>
                            <ThemedText variant="title3" weight="700">
                              {stats.me.sessionCount}
                            </ThemedText>
                            <ThemedText variant="caption" color="tertiary">
                              {t.friends.weekSessions(stats.me.sessionCount)}
                            </ThemedText>
                            <ThemedText variant="caption" color="tertiary">
                              {t.friends.weekVolume(stats.me.totalVolume)}
                            </ThemedText>
                          </View>
                          <View style={{ width: 1, backgroundColor: colors.separator }} />
                          <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
                            <ThemedText variant="footnote" weight="600" numberOfLines={1}>
                              {friend.displayName ?? friend.username}
                            </ThemedText>
                            <ThemedText variant="title3" weight="700">
                              {stats.friend.sessionCount}
                            </ThemedText>
                            <ThemedText variant="caption" color="tertiary">
                              {t.friends.weekSessions(stats.friend.sessionCount)}
                            </ThemedText>
                            <ThemedText variant="caption" color="tertiary">
                              {t.friends.weekVolume(stats.friend.totalVolume)}
                            </ThemedText>
                          </View>
                        </View>
                      ) : (
                        <ThemedText variant="caption" color="tertiary">
                          …
                        </ThemedText>
                      )}
                    </View>
                  )}
                </Card>
              );
            })
          )}
        </Section>
      </ScrollView>
    </ThemedView>
  );
}
