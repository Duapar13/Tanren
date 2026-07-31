import { useMemo, useRef, useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { ThemedText } from '../components/ThemedText';
import { ThemedView } from '../components/ThemedView';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { ShareCard } from '../components/ShareCard';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../hooks/useTheme';
import { Spacing } from '../constants/theme';
import { computeMonthlyRecap } from '../utils/monthlyStats';
import { shareCardAsImage } from '../lib/shareCard';
import { formatWeight } from '../utils/units';

function deltaLabel(current: number, reference: number): string {
  if (reference <= 0) return current > 0 ? 'nouveau' : '—';
  const pct = Math.round(((current - reference) / reference) * 100);
  return `${pct >= 0 ? '+' : ''}${pct}%`;
}

export default function MonthRecapScreen() {
  const { year, month } = useLocalSearchParams<{ year: string; month: string }>();
  const { sets, sessions } = useData();
  const { user } = useAuth();
  const weightUnit = user?.weightUnit ?? 'kg';
  const { colors } = useTheme();
  const cardRef = useRef<View>(null);
  const [sharing, setSharing] = useState(false);

  const viewYear = Number(year);
  const viewMonth = Number(month);

  const monthLabel = useMemo(() => {
    const label = new Date(viewYear, viewMonth, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    return label.charAt(0).toUpperCase() + label.slice(1);
  }, [viewYear, viewMonth]);

  const recap = useMemo(
    () => computeMonthlyRecap(sets, sessions, viewYear, viewMonth),
    [sets, sessions, viewYear, viewMonth]
  );
  const { current, previousMonth, avg3Months, avg6Months, avg12Months } = recap;

  const handleShare = async () => {
    setSharing(true);
    try {
      await shareCardAsImage(cardRef);
    } catch {
      Alert.alert('Partage', "Impossible de générer la fiche pour le moment.");
    } finally {
      setSharing(false);
    }
  };

  return (
    <ThemedView variant="grouped" style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.lg }}>
        <ThemedText variant="title1">{monthLabel}</ThemedText>

        <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
          <Stat label="Séances" value={String(current.sessionCount)} />
          <Stat label="Séries" value={String(current.setCount)} />
          <Stat label="Volume" value={formatWeight(current.totalVolume, weightUnit, 0)} />
        </View>

        <View>
          <ThemedText variant="headline" style={{ marginBottom: Spacing.sm }}>
            Comparaison du volume
          </ThemedText>
          <Card style={{ gap: 6 }}>
            <CompareRow label="Mois précédent" value={deltaLabel(current.totalVolume, previousMonth.totalVolume)} />
            <CompareRow label="Moyenne 3 derniers mois" value={deltaLabel(current.totalVolume, avg3Months.avgVolume)} />
            <CompareRow label="Moyenne 6 derniers mois" value={deltaLabel(current.totalVolume, avg6Months.avgVolume)} />
            <CompareRow label="Moyenne sur l'année" value={deltaLabel(current.totalVolume, avg12Months.avgVolume)} />
          </Card>
        </View>

        <View>
          <ThemedText variant="headline" style={{ marginBottom: Spacing.sm }}>
            Meilleures perfs du mois
          </ThemedText>
          <Card style={{ gap: 6 }}>
            {current.bestPerformances.length === 0 ? (
              <ThemedText variant="footnote" color="tertiary">
                Aucun nouveau record ce mois-ci.
              </ThemedText>
            ) : (
              current.bestPerformances.map((p, i) => (
                <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <ThemedText variant="footnote" color="secondary">
                    {p.exerciseName}
                  </ThemedText>
                  <ThemedText variant="footnote" weight="600" style={{ color: colors.positive }}>
                    {formatWeight(p.est1RM, weightUnit)} · {p.date}
                  </ThemedText>
                </View>
              ))
            )}
          </Card>
        </View>

        <View>
          <ThemedText variant="headline" style={{ marginBottom: Spacing.sm }}>
            Stagnations
          </ThemedText>
          <Card style={{ gap: 6 }}>
            {current.stagnant.length === 0 ? (
              <ThemedText variant="footnote" color="tertiary">
                Rien à signaler — tout progresse ou n'a pas encore été retravaillé.
              </ThemedText>
            ) : (
              current.stagnant.map((s) => (
                <ThemedText key={s.exerciseId} variant="footnote" color="secondary">
                  {s.exerciseName} — pas de record battu ce mois-ci
                </ThemedText>
              ))
            )}
          </Card>
        </View>

        <ThemedText variant="headline">Ta fiche</ThemedText>
        <View style={{ alignItems: 'center', gap: Spacing.md }}>
          <ShareCard
            ref={cardRef}
            variant="month"
            monthLabel={monthLabel}
            sessionCount={current.sessionCount}
            setCount={current.setCount}
            totalVolume={current.totalVolume}
            bestPerformances={current.bestPerformances}
            weightUnit={weightUnit}
          />
          <Button title={sharing ? 'Génération…' : 'Partager'} onPress={handleShare} disabled={sharing} style={{ width: '100%' }} />
        </View>
      </ScrollView>
    </ThemedView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <ThemedText variant="title3" weight="700">
        {value}
      </ThemedText>
      <ThemedText variant="caption" color="tertiary">
        {label}
      </ThemedText>
    </View>
  );
}

function CompareRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <ThemedText variant="footnote" color="secondary">
        {label}
      </ThemedText>
      <ThemedText variant="footnote" weight="600">
        {value}
      </ThemedText>
    </View>
  );
}
