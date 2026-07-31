import { View } from 'react-native';
import { Popup } from './Popup';
import { ThemedText } from './ThemedText';
import { Spacing } from '../constants/theme';
import { SetWithExercise } from '../types';

function groupByExercise(sets: SetWithExercise[]) {
  const map = new Map<number, SetWithExercise[]>();
  for (const s of sets) {
    if (!map.has(s.exerciseId)) map.set(s.exerciseId, []);
    map.get(s.exerciseId)!.push(s);
  }
  return [...map.entries()];
}

interface Props {
  visible: boolean;
  onClose: () => void;
  date: string | null;
  sets: SetWithExercise[];
}

/** Read-only recap of a past day's session — same grouping as Séance's TodaySessionsReview,
 * without the edit/delete controls (those are for the in-progress "today" log, not history). */
export function SessionDetailPopup({ visible, onClose, date, sets }: Props) {
  const grouped = groupByExercise(sets);

  return (
    <Popup visible={visible} onClose={onClose} title={date ?? ''}>
      <View style={{ gap: Spacing.md }}>
        {grouped.length === 0 ? (
          <ThemedText color="secondary" style={{ textAlign: 'center' }}>
            Aucun exercice enregistré ce jour-là.
          </ThemedText>
        ) : (
          grouped.map(([exerciseId, exerciseSets]) => (
            <View key={exerciseId} style={{ gap: 4 }}>
              <ThemedText variant="subhead" weight="600">
                {exerciseSets[0].exerciseName}
              </ThemedText>
              {exerciseSets.map((s, i) => (
                <ThemedText key={s.id} variant="footnote" color="secondary">
                  Série {i + 1} · {s.reps} reps × {s.weightKg} kg{s.rpe ? ` · RPE ${s.rpe}` : ''}
                </ThemedText>
              ))}
            </View>
          ))
        )}
      </View>
    </Popup>
  );
}
