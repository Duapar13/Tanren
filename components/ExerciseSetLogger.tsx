import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Exercise } from '../types';
import { useTheme } from '../hooks/useTheme';
import { Radius, Spacing } from '../constants/theme';
import { ThemedText } from './ThemedText';
import { Card } from './Card';
import { Input } from './Input';

export interface DraftSet {
  reps: number;
  weightKg: number;
  rpe: number | null;
}

interface Props {
  exercise: Exercise;
  draftSets: DraftSet[];
  onAddSet: (set: DraftSet) => void;
  onRemoveSet: (index: number) => void;
  onRemoveExercise: () => void;
}

export function ExerciseSetLogger({
  exercise,
  draftSets,
  onAddSet,
  onRemoveSet,
  onRemoveExercise,
}: Props) {
  const { colors } = useTheme();
  const [reps, setReps] = useState('');
  const [weight, setWeight] = useState('');
  const [rpe, setRpe] = useState('');

  const num = (v: string) => {
    const n = parseFloat(v.replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  };

  const handleAdd = () => {
    if (!reps || !weight) return;
    onAddSet({
      reps: Math.round(num(reps)),
      weightKg: num(weight),
      rpe: rpe ? num(rpe) : null,
    });
    setReps('');
    setWeight('');
    setRpe('');
  };

  return (
    <Card style={{ gap: Spacing.sm }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <ThemedText variant="headline">{exercise.name}</ThemedText>
        <Pressable onPress={onRemoveExercise}>
          <Ionicons name="close-circle-outline" size={20} color={colors.textTertiary} />
        </Pressable>
      </View>

      {draftSets.map((s, i) => (
        <View
          key={i}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: 4,
          }}
        >
          <ThemedText variant="subhead" color="secondary">
            Série {i + 1} · {s.reps} reps × {s.weightKg} kg
            {s.rpe ? ` · RPE ${s.rpe}` : ''}
          </ThemedText>
          <Pressable onPress={() => onRemoveSet(i)}>
            <Ionicons name="trash-outline" size={16} color={colors.textTertiary} />
          </Pressable>
        </View>
      ))}

      <View style={{ flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-end' }}>
        <View style={{ flex: 1 }}>
          <ThemedText variant="caption" color="tertiary">
            Reps
          </ThemedText>
          <Input keyboardType="number-pad" value={reps} onChangeText={setReps} placeholder="0" />
        </View>
        <View style={{ flex: 1 }}>
          <ThemedText variant="caption" color="tertiary">
            Poids (kg)
          </ThemedText>
          <Input keyboardType="decimal-pad" value={weight} onChangeText={setWeight} placeholder="0" />
        </View>
        <View style={{ flex: 1 }}>
          <ThemedText variant="caption" color="tertiary">
            RPE
          </ThemedText>
          <Input keyboardType="decimal-pad" value={rpe} onChangeText={setRpe} placeholder="opt." />
        </View>
        <Pressable
          onPress={handleAdd}
          style={{
            width: 36,
            height: 36,
            borderRadius: Radius.sm,
            backgroundColor: colors.accent,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="add" size={20} color="#FFFFFF" />
        </Pressable>
      </View>
    </Card>
  );
}
