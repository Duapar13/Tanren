import { Alert, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from './Card';
import { ThemedText } from './ThemedText';
import { useData } from '../context/DataContext';
import { useTheme } from '../hooks/useTheme';
import { Spacing } from '../constants/theme';
import { SessionCategory, SetWithExercise } from '../types';
import { todayKey } from '../utils/date';

const CATEGORY_LABELS: Record<SessionCategory, string> = {
  upper: 'Haut',
  lower: 'Bas',
  custom: 'Perso',
};

function groupByExercise(setsForSession: SetWithExercise[]) {
  const byExercise = new Map<number, SetWithExercise[]>();
  for (const s of setsForSession) {
    const list = byExercise.get(s.exerciseId) ?? [];
    list.push(s);
    byExercise.set(s.exerciseId, list);
  }
  return Array.from(byExercise.entries());
}

export function TodaySessionsReview() {
  const { sessions, sets, removeSet, removeSession } = useData();
  const { colors } = useTheme();

  const today = todayKey();
  const todaysSessions = sessions.filter((s) => s.date === today);

  if (todaysSessions.length === 0) return null;

  const confirmDeleteSession = (sessionId: number) => {
    Alert.alert('Supprimer la séance', 'Toute la séance sera supprimée.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => removeSession(sessionId) },
    ]);
  };

  return (
    <View style={{ gap: Spacing.sm }}>
      <ThemedText variant="headline">Aujourd’hui</ThemedText>
      {todaysSessions.map((session) => {
        const setsForSession = sets.filter((s) => s.sessionId === session.id);
        const grouped = groupByExercise(setsForSession);

        return (
          <Card key={session.id} style={{ gap: Spacing.sm }}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <ThemedText variant="subhead" weight="600">
                {CATEGORY_LABELS[session.category]}
              </ThemedText>
              <Pressable onPress={() => confirmDeleteSession(session.id)}>
                <ThemedText variant="footnote" weight="600" style={{ color: colors.negative }}>
                  Supprimer la séance
                </ThemedText>
              </Pressable>
            </View>

            {grouped.map(([exerciseId, exerciseSets]) => (
              <View key={exerciseId} style={{ gap: 4 }}>
                <ThemedText variant="subhead">{exerciseSets[0].exerciseName}</ThemedText>
                {exerciseSets.map((s, i) => (
                  <View
                    key={s.id}
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <ThemedText variant="footnote" color="secondary">
                      Série {i + 1} · {s.reps} reps × {s.weightKg} kg
                      {s.rpe ? ` · RPE ${s.rpe}` : ''}
                    </ThemedText>
                    <Pressable onPress={() => removeSet(s.id)}>
                      <Ionicons name="trash-outline" size={16} color={colors.textTertiary} />
                    </Pressable>
                  </View>
                ))}
              </View>
            ))}
          </Card>
        );
      })}
    </View>
  );
}
