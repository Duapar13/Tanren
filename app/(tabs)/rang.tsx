import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '../../components/ScreenHeader';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { Card } from '../../components/Card';
import { ProgressBar } from '../../components/ProgressBar';
import { StatTile } from '../../components/StatTile';
import { Popup } from '../../components/Popup';
import { Input } from '../../components/Input';
import { SeasonMedalBadge } from '../../components/SeasonMedalBadge';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../hooks/useTheme';
import { Spacing } from '../../constants/theme';
import {
  computeSeasonMedalHistory,
  computeSeasonRanking,
  daysUntilNextSeason,
  POINTS_PER_DIVISION,
  RANK_COLORS,
  seasonLabel,
} from '../../utils/ranking';
import { computeBadgeStatuses, type BadgeStatus } from '../../utils/badges';
import { checkDevPassword, getDevBonusPoints, setDevBonusPoints } from '../../lib/devMode';

function formatPoints(points: number): string {
  return `${points >= 0 ? '+' : ''}${points} pt${Math.abs(points) > 1 ? 's' : ''}`;
}

export default function RangScreen() {
  const { sessions, sets, nutritionEntries, bodyWeightEntries } = useData();
  const { user } = useAuth();
  const { colors } = useTheme();

  const [devBonus, setDevBonus] = useState(0);
  const [devUnlocked, setDevUnlocked] = useState(false);
  const [devPasswordPromptVisible, setDevPasswordPromptVisible] = useState(false);
  const [devPasswordInput, setDevPasswordInput] = useState('');
  const [devPasswordError, setDevPasswordError] = useState(false);
  const [devBonusInput, setDevBonusInput] = useState('0');
  const [selectedBadge, setSelectedBadge] = useState<BadgeStatus | null>(null);

  useFocusEffect(
    useCallback(() => {
      getDevBonusPoints().then((points) => {
        setDevBonus(points);
        setDevBonusInput(String(points));
      });
    }, [])
  );

  const rankingParams = useMemo(
    () => ({
      sessions,
      sets,
      nutritionEntries,
      bodyWeightEntries,
      trainingDays: user?.trainingDays ?? [],
      splitType: user?.splitType ?? ('upper_lower' as const),
      goal: user?.goal ?? ('maintain' as const),
    }),
    [sessions, sets, nutritionEntries, bodyWeightEntries, user]
  );

  const ranking = useMemo(
    () => computeSeasonRanking(rankingParams, undefined, devBonus),
    [rankingParams, devBonus]
  );

  const seasonMedals = useMemo(
    () => computeSeasonMedalHistory(rankingParams, devBonus),
    [rankingParams, devBonus]
  );

  const { state } = ranking;
  const rankColor = RANK_COLORS[state.rank];

  const badgeStatuses = useMemo(() => computeBadgeStatuses(rankingParams), [rankingParams]);

  function handleDevPasswordSubmit() {
    if (checkDevPassword(devPasswordInput)) {
      setDevUnlocked(true);
      setDevPasswordPromptVisible(false);
      setDevPasswordInput('');
      setDevPasswordError(false);
    } else {
      setDevPasswordError(true);
    }
  }

  async function handleApplyDevBonus() {
    const parsed = parseInt(devBonusInput, 10);
    const points = Number.isFinite(parsed) ? parsed : 0;
    await setDevBonusPoints(points);
    setDevBonus(points);
    setDevBonusInput(String(points));
  }

  async function handleResetDevBonus() {
    await setDevBonusPoints(0);
    setDevBonus(0);
    setDevBonusInput('0');
  }

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
            <Pressable
              onLongPress={() => !devUnlocked && setDevPasswordPromptVisible(true)}
              delayLongPress={800}
            >
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
            </Pressable>
            <ThemedText variant="title1" weight="700">
              {state.rank} {state.division}
            </ThemedText>
            <ThemedText variant="subhead" color="secondary">
              {seasonLabel(ranking.seasonInfo)}
            </ThemedText>
            {devBonus !== 0 && (
              <View
                style={{
                  paddingHorizontal: Spacing.sm,
                  paddingVertical: 4,
                  borderRadius: 999,
                  backgroundColor: colors.accent + '26',
                }}
              >
                <ThemedText variant="caption" weight="600" color="accent">
                  Mode dev actif · {formatPoints(devBonus)}
                </ThemedText>
              </View>
            )}

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

          {devUnlocked && (
            <Card style={{ gap: Spacing.sm }}>
              <ThemedText variant="headline">Mode dev</ThemedText>
              <ThemedText variant="footnote" color="secondary">
                Ajoute des points bonus locaux pour prévisualiser un rang ou une médaille de saison. N'est jamais
                envoyé au serveur.
              </ThemedText>
              <Input
                value={devBonusInput}
                onChangeText={setDevBonusInput}
                keyboardType="numbers-and-punctuation"
                placeholder="Points bonus"
              />
              <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                <Pressable
                  onPress={handleApplyDevBonus}
                  style={{
                    flex: 1,
                    paddingVertical: Spacing.md,
                    borderRadius: 10,
                    backgroundColor: colors.accent,
                    alignItems: 'center',
                  }}
                >
                  <ThemedText variant="subhead" weight="600" style={{ color: '#FFFFFF' }}>
                    Appliquer
                  </ThemedText>
                </Pressable>
                <Pressable
                  onPress={handleResetDevBonus}
                  style={{
                    flex: 1,
                    paddingVertical: Spacing.md,
                    borderRadius: 10,
                    backgroundColor: colors.fill,
                    alignItems: 'center',
                  }}
                >
                  <ThemedText variant="subhead" weight="600">
                    Réinitialiser
                  </ThemedText>
                </Pressable>
              </View>
            </Card>
          )}

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
              {badgeStatuses.map((status) => {
                const { badge, unlocked } = status;
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
                      {badge.name}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </Card>
          </View>

          <View>
            <ThemedText variant="headline" style={{ marginBottom: Spacing.sm }}>
              Historique des saisons
            </ThemedText>
            <Card>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.lg }}>
                {seasonMedals.map((medal) => (
                  <View key={medal.seasonInfo.seasonNumber} style={{ alignItems: 'center', gap: 4, width: 92 }}>
                    <SeasonMedalBadge medal={medal} size={84} />
                    <ThemedText variant="caption" weight="600" color={medal.isComplete ? 'secondary' : 'accent'}>
                      {medal.isComplete ? 'Terminée' : 'En cours'}
                    </ThemedText>
                  </View>
                ))}
              </ScrollView>
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

        <Popup title={selectedBadge?.badge.name ?? ''} visible={!!selectedBadge} onClose={() => setSelectedBadge(null)}>
          {selectedBadge && (
            <View style={{ gap: Spacing.sm }}>
              <ThemedText color="secondary" style={{ textAlign: 'center' }}>
                {selectedBadge.badge.description}
              </ThemedText>
              <ThemedText weight="600" style={{ textAlign: 'center' }}>
                {selectedBadge.unlocked ? 'Débloqué ✓' : `Progression : ${selectedBadge.progress}`}
              </ThemedText>
            </View>
          )}
        </Popup>

        <Popup
          title="Mode dev"
          visible={devPasswordPromptVisible}
          onClose={() => {
            setDevPasswordPromptVisible(false);
            setDevPasswordInput('');
            setDevPasswordError(false);
          }}
        >
          <View style={{ gap: Spacing.sm }}>
            <ThemedText color="secondary" style={{ textAlign: 'center' }}>
              Entre le mot de passe pour prévisualiser des rangs et médailles.
            </ThemedText>
            <Input
              value={devPasswordInput}
              onChangeText={(text) => {
                setDevPasswordInput(text);
                setDevPasswordError(false);
              }}
              placeholder="Mot de passe"
              secureTextEntry
              autoCapitalize="none"
              onSubmitEditing={handleDevPasswordSubmit}
              returnKeyType="done"
            />
            {devPasswordError && (
              <ThemedText variant="footnote" style={{ color: colors.negative, textAlign: 'center' }}>
                Mot de passe incorrect.
              </ThemedText>
            )}
            <Pressable
              onPress={handleDevPasswordSubmit}
              style={{
                paddingVertical: Spacing.md,
                borderRadius: 10,
                backgroundColor: colors.accent,
                alignItems: 'center',
              }}
            >
              <ThemedText variant="subhead" weight="600" style={{ color: '#FFFFFF' }}>
                Déverrouiller
              </ThemedText>
            </Pressable>
          </View>
        </Popup>
      </SafeAreaView>
    </ThemedView>
  );
}
