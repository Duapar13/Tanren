import { useMemo } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '../../components/ScreenHeader';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { Card } from '../../components/Card';
import { ProgressBar } from '../../components/ProgressBar';
import { StatTile } from '../../components/StatTile';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../hooks/useTheme';
import { Spacing } from '../../constants/theme';
import {
  computeSeasonRanking,
  daysUntilNextSeason,
  POINTS_PER_DIVISION,
  RANK_COLORS,
  seasonLabel,
} from '../../utils/ranking';
import { computeBadgeStatuses } from '../../utils/badges';

function formatPoints(points: number): string {
  return `${points >= 0 ? '+' : ''}${points} pt${Math.abs(points) > 1 ? 's' : ''}`;
}

export default function RangScreen() {
  const { sessions, sets, nutritionEntries, bodyWeightEntries } = useData();
  const { user } = useAuth();
  const { colors } = useTheme();

  const ranking = useMemo(
    () =>
      computeSeasonRanking({
        sessions,
        sets,
        nutritionEntries,
        bodyWeightEntries,
        trainingDays: user?.trainingDays ?? [],
        splitType: user?.splitType ?? 'upper_lower',
        goal: user?.goal ?? 'maintain',
      }),
    [sessions, sets, nutritionEntries, bodyWeightEntries, user]
  );

  const { state } = ranking;
  const rankColor = RANK_COLORS[state.rank];

  const badgeStatuses = useMemo(
    () =>
      computeBadgeStatuses({
        sessions,
        sets,
        nutritionEntries,
        bodyWeightEntries,
        trainingDays: user?.trainingDays ?? [],
        splitType: user?.splitType ?? 'upper_lower',
        goal: user?.goal ?? 'maintain',
      }),
    [sessions, sets, nutritionEntries, bodyWeightEntries, user]
  );

  return (
    <ThemedView variant="grouped" style={{ flex: 1 }}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScreenHeader />
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
              {seasonLabel(ranking.seasonId)}
            </ThemedText>

            <View style={{ width: '100%', gap: 6, marginTop: Spacing.sm }}>
              {state.isMaxTier ? (
                <ThemedText variant="footnote" color="accent" weight="600" style={{ textAlign: 'center' }}>
                  Rang maximum atteint pour cette saison !
                </ThemedText>
              ) : (
                <>
                  <ProgressBar progress={state.pointsInDivision / POINTS_PER_DIVISION} tintColor={rankColor} />
                  <ThemedText variant="caption" color="tertiary" style={{ textAlign: 'center' }}>
                    {state.pointsInDivision} / {POINTS_PER_DIVISION} pts vers la division suivante
                  </ThemedText>
                </>
              )}
            </View>

            <ThemedText variant="caption" color="tertiary">
              Nouvelle saison dans {daysUntilNextSeason()} jour{daysUntilNextSeason() > 1 ? 's' : ''}
            </ThemedText>
          </Card>

          <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
            <StatTile label="Régularité" value={formatPoints(ranking.breakdown.streak)} />
            <StatTile label="Force" value={formatPoints(ranking.breakdown.pr)} />
            <StatTile label="Nutrition" value={formatPoints(ranking.breakdown.nutrition)} />
          </View>

          <View>
            <ThemedText variant="headline" style={{ marginBottom: Spacing.sm }}>
              Badges
            </ThemedText>
            <Card style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md }}>
              {badgeStatuses.map(({ badge, unlocked, progress }) => (
                <Pressable
                  key={badge.id}
                  onPress={() =>
                    Alert.alert(
                      badge.name,
                      `${badge.description}\n\n${unlocked ? 'Débloqué ✓' : `Progression : ${progress}`}`
                    )
                  }
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
                    {badge.name}
                  </ThemedText>
                </Pressable>
              ))}
            </Card>
          </View>

          <View>
            <ThemedText variant="headline" style={{ marginBottom: Spacing.sm }}>
              Historique de la saison
            </ThemedText>
            {ranking.events.length === 0 ? (
              <Card>
                <ThemedText color="secondary" style={{ textAlign: 'center' }}>
                  Aucun point ce mois-ci pour l’instant — logge une séance pour commencer.
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
                    <ThemedText
                      variant="subhead"
                      weight="700"
                      style={{ color: e.points >= 0 ? colors.positive : colors.negative }}
                    >
                      {formatPoints(e.points)}
                    </ThemedText>
                  </View>
                ))}
              </Card>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}
