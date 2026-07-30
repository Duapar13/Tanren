import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Slider from '@react-native-community/slider';
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
  type RankName,
  type SeasonMedal,
  type SeasonRanking,
} from '../../utils/ranking';
import { computeBadgeStatuses, type BadgeStatus } from '../../utils/badges';
import { checkDevPassword, getDevBonusPoints, setDevBonusPoints } from '../../lib/devMode';
import { generateRandomMedals } from '../../utils/devMedals';

function formatPoints(points: number): string {
  return `${points >= 0 ? '+' : ''}${points} pt${Math.abs(points) > 1 ? 's' : ''}`;
}

function filledCountOf(medal: SeasonMedal): number {
  return medal.segments.filter((s) => s !== null).length;
}

function monthLabelForSegment(medal: SeasonMedal, index: number): string {
  const start = new Date(`${medal.seasonInfo.startDate}T00:00:00`);
  const d = new Date(start.getFullYear(), start.getMonth() + index, 1);
  const label = d.toLocaleDateString('fr-FR', { month: 'long' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

type MedalKind = 'current' | 'history' | 'test';
interface MedalSelection {
  medal: SeasonMedal;
  kind: MedalKind;
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
  const [devSegmentsOverride, setDevSegmentsOverride] = useState<number | null>(null);
  const [segmentSliderKey, setSegmentSliderKey] = useState(0);
  const [testMedalCount, setTestMedalCount] = useState(6);
  const [testMedals, setTestMedals] = useState<SeasonMedal[]>([]);
  const [selectedMedal, setSelectedMedal] = useState<MedalSelection | null>(null);

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

  const badgeStatuses = useMemo(
    () => computeBadgeStatuses(rankingParams, devBonus),
    [rankingParams, devBonus]
  );

  // Manual "barrettes" override for the live season medal — lets the current-season count
  // (only ever a few months in) be previewed as if more months had already passed.
  const displayedMedals = useMemo(() => {
    const [current, ...rest] = seasonMedals;
    if (!current || devSegmentsOverride === null) return seasonMedals;
    const overriddenSegments: (RankName | null)[] = Array.from({ length: 6 }, (_, i) =>
      i < devSegmentsOverride ? state.rank : null
    );
    const overridden: SeasonMedal = {
      ...current,
      segments: overriddenSegments,
      peakRank: devSegmentsOverride > 0 ? state.rank : current.peakRank,
      isComplete: devSegmentsOverride === 6,
    };
    return [overridden, ...rest];
  }, [seasonMedals, devSegmentsOverride, state.rank]);

  const selectedStats: SeasonRanking | null = useMemo(() => {
    if (!selectedMedal || selectedMedal.kind === 'test') return null;
    if (selectedMedal.kind === 'current') return ranking;
    return computeSeasonRanking(rankingParams, selectedMedal.medal.seasonInfo, 0);
  }, [selectedMedal, ranking, rankingParams]);

  function openMedalDetail(medal: SeasonMedal, kind: MedalKind) {
    setSelectedMedal({ medal, kind });
  }

  function handleGenerateTestMedals() {
    setTestMedals(generateRandomMedals(testMedalCount));
  }

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

              <View style={{ height: 1, backgroundColor: colors.separator, marginVertical: Spacing.xs }} />

              <ThemedText variant="subhead" weight="600">
                Barrettes de la saison en cours : {devSegmentsOverride ?? filledCountOf(seasonMedals[0])} / 6
              </ThemedText>
              <Slider
                key={`segments-${segmentSliderKey}`}
                minimumValue={0}
                maximumValue={6}
                step={1}
                value={devSegmentsOverride ?? filledCountOf(seasonMedals[0])}
                onValueChange={setDevSegmentsOverride}
                minimumTrackTintColor={colors.accent}
                maximumTrackTintColor={colors.separator}
                thumbTintColor={colors.accent}
              />
              <Pressable
                onPress={() => {
                  setDevSegmentsOverride(null);
                  setSegmentSliderKey((k) => k + 1);
                }}
                style={{
                  paddingVertical: Spacing.sm,
                  borderRadius: 10,
                  backgroundColor: colors.fill,
                  alignItems: 'center',
                }}
              >
                <ThemedText variant="footnote" weight="600">
                  Réinitialiser l'aperçu de la médaille
                </ThemedText>
              </Pressable>

              <View style={{ height: 1, backgroundColor: colors.separator, marginVertical: Spacing.xs }} />

              <ThemedText variant="subhead" weight="600">
                Générer des médailles de test : {testMedalCount}
              </ThemedText>
              <ThemedText variant="footnote" color="secondary">
                Crée des médailles aléatoires (complètes ou non, rangs variés) pour comparer les couleurs.
              </ThemedText>
              <Slider
                minimumValue={1}
                maximumValue={12}
                step={1}
                value={testMedalCount}
                onValueChange={setTestMedalCount}
                minimumTrackTintColor={colors.accent}
                maximumTrackTintColor={colors.separator}
                thumbTintColor={colors.accent}
              />
              <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                <Pressable
                  onPress={handleGenerateTestMedals}
                  style={{
                    flex: 1,
                    paddingVertical: Spacing.md,
                    borderRadius: 10,
                    backgroundColor: colors.accent,
                    alignItems: 'center',
                  }}
                >
                  <ThemedText variant="subhead" weight="600" style={{ color: '#FFFFFF' }}>
                    Aléatoire
                  </ThemedText>
                </Pressable>
                {testMedals.length > 0 && (
                  <Pressable
                    onPress={() => setTestMedals([])}
                    style={{
                      flex: 1,
                      paddingVertical: Spacing.md,
                      borderRadius: 10,
                      backgroundColor: colors.fill,
                      alignItems: 'center',
                    }}
                  >
                    <ThemedText variant="subhead" weight="600">
                      Effacer
                    </ThemedText>
                  </Pressable>
                )}
              </View>

              {testMedals.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: Spacing.lg, paddingTop: Spacing.xs }}
                >
                  {testMedals.map((medal, i) => (
                    <Pressable
                      key={i}
                      onPress={() => openMedalDetail(medal, 'test')}
                      style={{ alignItems: 'center', gap: 4, width: 92 }}
                    >
                      <SeasonMedalBadge medal={medal} size={84} />
                      <ThemedText variant="caption" weight="600" color="tertiary">
                        {medal.isComplete ? 'Complète' : 'Partielle'}
                      </ThemedText>
                    </Pressable>
                  ))}
                </ScrollView>
              )}
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
                {displayedMedals.map((medal, i) => (
                  <Pressable
                    key={medal.seasonInfo.seasonNumber}
                    onPress={() => openMedalDetail(medal, i === 0 ? 'current' : 'history')}
                    style={{ alignItems: 'center', gap: 4, width: 92 }}
                  >
                    <SeasonMedalBadge medal={medal} size={84} />
                    <ThemedText variant="caption" weight="600" color={medal.isComplete ? 'secondary' : 'accent'}>
                      {medal.isComplete ? 'Terminée' : 'En cours'}
                    </ThemedText>
                  </Pressable>
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
          title={
            selectedMedal
              ? selectedMedal.kind === 'test'
                ? 'Médaille de test'
                : seasonLabel(selectedMedal.medal.seasonInfo)
              : ''
          }
          visible={!!selectedMedal}
          onClose={() => setSelectedMedal(null)}
        >
          {selectedMedal && (
            <View style={{ gap: Spacing.sm }}>
              <View style={{ alignItems: 'center' }}>
                <SeasonMedalBadge medal={selectedMedal.medal} size={110} />
              </View>
              {selectedMedal.kind === 'test' && (
                <ThemedText variant="footnote" color="tertiary" style={{ textAlign: 'center' }}>
                  Médaille générée aléatoirement pour prévisualiser le design — ne reflète pas de vraies données.
                </ThemedText>
              )}
              <ThemedText weight="600" style={{ textAlign: 'center' }}>
                Rang de pointe :{' '}
                <ThemedText weight="700" style={{ color: RANK_COLORS[selectedMedal.medal.peakRank] }}>
                  {selectedMedal.medal.peakRank}
                </ThemedText>
              </ThemedText>
              {selectedStats && (
                <ThemedText color="secondary" style={{ textAlign: 'center' }}>
                  {selectedStats.totalPoints} pts au total · Régularité {formatPoints(selectedStats.breakdown.streak)} ·
                  Force {formatPoints(selectedStats.breakdown.pr)} · Nutrition{' '}
                  {formatPoints(selectedStats.breakdown.nutrition)}
                </ThemedText>
              )}
              <View style={{ gap: 4 }}>
                {selectedMedal.medal.segments.map((rank, i) => (
                  <View
                    key={i}
                    style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 }}
                  >
                    <ThemedText color="secondary">{monthLabelForSegment(selectedMedal.medal, i)}</ThemedText>
                    <ThemedText weight="600" style={{ color: rank ? RANK_COLORS[rank] : colors.textTertiary }}>
                      {rank ?? '—'}
                    </ThemedText>
                  </View>
                ))}
              </View>
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
