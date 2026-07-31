import { ScrollView, View } from 'react-native';
import { Popup } from './Popup';
import { ThemedText } from './ThemedText';
import { useTheme } from '../hooks/useTheme';
import { Spacing } from '../constants/theme';
import { MonthlyRecap } from '../utils/monthlyStats';

interface Props {
  visible: boolean;
  onClose: () => void;
  monthLabel: string;
  recap: MonthlyRecap | null;
}

function deltaLabel(current: number, reference: number): string {
  if (reference <= 0) return current > 0 ? 'nouveau' : '—';
  const pct = Math.round(((current - reference) / reference) * 100);
  return `${pct >= 0 ? '+' : ''}${pct}%`;
}

export function MonthStatsPopup({ visible, onClose, monthLabel, recap }: Props) {
  const { colors } = useTheme();
  if (!recap) return null;
  const { current, previousMonth, avg3Months, avg6Months, avg12Months } = recap;

  return (
    <Popup visible={visible} onClose={onClose} title={monthLabel}>
      <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ gap: Spacing.lg }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
          <Stat label="Séances" value={String(current.sessionCount)} />
          <Stat label="Séries" value={String(current.setCount)} />
          <Stat label="Volume" value={`${Math.round(current.totalVolume)} kg`} />
        </View>

        <View style={{ gap: 6 }}>
          <ThemedText variant="subhead" weight="600">
            Comparaison du volume
          </ThemedText>
          <CompareRow label="Mois précédent" value={deltaLabel(current.totalVolume, previousMonth.totalVolume)} />
          <CompareRow label="Moyenne 3 derniers mois" value={deltaLabel(current.totalVolume, avg3Months.avgVolume)} />
          <CompareRow label="Moyenne 6 derniers mois" value={deltaLabel(current.totalVolume, avg6Months.avgVolume)} />
          <CompareRow label="Moyenne sur l'année" value={deltaLabel(current.totalVolume, avg12Months.avgVolume)} />
        </View>

        <View style={{ gap: 6 }}>
          <ThemedText variant="subhead" weight="600">
            Meilleures perfs du mois
          </ThemedText>
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
                  {p.est1RM.toFixed(1)} kg · {p.date}
                </ThemedText>
              </View>
            ))
          )}
        </View>

        <View style={{ gap: 6 }}>
          <ThemedText variant="subhead" weight="600">
            Stagnations
          </ThemedText>
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
        </View>
      </ScrollView>
    </Popup>
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
