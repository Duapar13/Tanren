import { useState } from 'react';
import { Alert, Keyboard, Pressable, View } from 'react-native';
import { Card } from './Card';
import { ThemedText } from './ThemedText';
import { Input } from './Input';
import { Button } from './Button';
import { IconButton } from './IconButton';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Spacing } from '../constants/theme';
import { SetWithExercise } from '../types';
import { todayKey } from '../utils/date';

function groupByExercise(setsForSession: SetWithExercise[]) {
  const byExercise = new Map<number, SetWithExercise[]>();
  for (const s of setsForSession) {
    const list = byExercise.get(s.exerciseId) ?? [];
    list.push(s);
    byExercise.set(s.exerciseId, list);
  }
  return Array.from(byExercise.entries());
}

const num = (v: string) => {
  const n = parseFloat(v.replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

export function TodaySessionsReview() {
  const { sessions, sets, removeSet, updateSet, removeSession } = useData();
  const { user } = useAuth();
  const rpeEnabled = user?.rpeEnabled ?? false;

  const [editingSetId, setEditingSetId] = useState<number | null>(null);
  const [editReps, setEditReps] = useState('');
  const [editWeight, setEditWeight] = useState('');
  const [editRpe, setEditRpe] = useState('');

  const today = todayKey();
  const todaysSessions = sessions.filter((s) => s.date === today);

  if (todaysSessions.length === 0) return null;

  const confirmDeleteSession = (sessionId: number) => {
    Alert.alert('Supprimer la séance', 'Toute la séance sera supprimée.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => removeSession(sessionId) },
    ]);
  };

  const confirmDeleteSet = (set: SetWithExercise) => {
    Alert.alert('Supprimer la série', undefined, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => {
          if (editingSetId === set.id) setEditingSetId(null);
          removeSet(set.id);
        },
      },
    ]);
  };

  const startEdit = (set: SetWithExercise) => {
    setEditingSetId(set.id);
    setEditReps(String(set.reps));
    setEditWeight(String(set.weightKg));
    setEditRpe(set.rpe != null ? String(set.rpe) : '');
  };

  const saveEdit = () => {
    if (editingSetId === null || !editReps || !editWeight) return;
    updateSet(editingSetId, {
      reps: Math.round(num(editReps)),
      weightKg: num(editWeight),
      rpe: rpeEnabled && editRpe ? num(editRpe) : null,
    });
    Keyboard.dismiss();
    setEditingSetId(null);
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
              <ThemedText variant="title3" weight="700">
                {grouped.length} exercice{grouped.length > 1 ? 's' : ''}
              </ThemedText>
              <IconButton
                name="trash-outline"
                variant="destructive"
                onPress={() => confirmDeleteSession(session.id)}
              />
            </View>

            {grouped.map(([exerciseId, exerciseSets]) => (
              <View key={exerciseId} style={{ gap: 4 }}>
                <ThemedText variant="subhead">{exerciseSets[0].exerciseName}</ThemedText>
                {exerciseSets.map((s, i) =>
                  editingSetId === s.id ? (
                    <View key={s.id} style={{ gap: Spacing.sm }}>
                      <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                        <View style={{ flex: 1 }}>
                          <ThemedText variant="caption" color="tertiary">
                            Reps
                          </ThemedText>
                          <Input
                            keyboardType="number-pad"
                            value={editReps}
                            onChangeText={setEditReps}
                            returnKeyType="done"
                            onSubmitEditing={Keyboard.dismiss}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <ThemedText variant="caption" color="tertiary">
                            Poids (kg)
                          </ThemedText>
                          <Input
                            keyboardType="decimal-pad"
                            value={editWeight}
                            onChangeText={setEditWeight}
                            returnKeyType="done"
                            onSubmitEditing={Keyboard.dismiss}
                          />
                        </View>
                        {rpeEnabled && (
                          <View style={{ flex: 1 }}>
                            <ThemedText variant="caption" color="tertiary">
                              RPE
                            </ThemedText>
                            <Input
                              keyboardType="decimal-pad"
                              value={editRpe}
                              onChangeText={setEditRpe}
                              returnKeyType="done"
                              onSubmitEditing={Keyboard.dismiss}
                            />
                          </View>
                        )}
                      </View>
                      <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                        <Button title="Enregistrer" onPress={saveEdit} style={{ flex: 1 }} />
                        <IconButton name="close" onPress={() => setEditingSetId(null)} />
                      </View>
                    </View>
                  ) : (
                    <View
                      key={s.id}
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <Pressable onPress={() => startEdit(s)} style={{ flex: 1, paddingVertical: Spacing.sm }}>
                        <ThemedText variant="footnote" color="secondary">
                          Série {i + 1} · {s.reps} reps × {s.weightKg} kg
                          {s.rpe ? ` · RPE ${s.rpe}` : ''}
                        </ThemedText>
                      </Pressable>
                      <IconButton
                        name="trash-outline"
                        variant="destructive"
                        size={18}
                        onPress={() => confirmDeleteSet(s)}
                      />
                    </View>
                  )
                )}
              </View>
            ))}
          </Card>
        );
      })}
    </View>
  );
}
