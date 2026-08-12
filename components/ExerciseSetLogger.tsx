import { useState } from 'react';
import { Alert, Keyboard, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Exercise } from '../types';
import { useTheme } from '../hooks/useTheme';
import { Radius, Spacing } from '../constants/theme';
import { ThemedText } from './ThemedText';
import { Card } from './Card';
import { Input } from './Input';
import { Button } from './Button';
import { IconButton } from './IconButton';
import { displayToKg, formatWeight, kgToDisplay, WeightUnit } from '../utils/units';
import { useTranslation } from '../hooks/useTranslation';
import { findExerciseGuide } from '../constants/exerciseGuides';

export interface DraftSet {
  reps: number;
  weightKg: number;
  rpe: number | null;
}

interface Props {
  exercise: Exercise;
  draftSets: DraftSet[];
  validated: boolean;
  rpeEnabled: boolean;
  weightUnit: WeightUnit;
  bestWeightKg?: number | null;
  onToggleValidated: () => void;
  onAddSet: (set: DraftSet) => void;
  onEditSet: (index: number, set: DraftSet) => void;
  onRemoveSet: (index: number) => void;
  onRemoveExercise: () => void;
}

const num = (v: string) => {
  const n = parseFloat(v.replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

export function ExerciseSetLogger({
  exercise,
  draftSets,
  validated,
  rpeEnabled,
  weightUnit,
  bestWeightKg,
  onToggleValidated,
  onAddSet,
  onEditSet,
  onRemoveSet,
  onRemoveExercise,
}: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [reps, setReps] = useState('');
  const [weight, setWeight] = useState('');
  const [rpe, setRpe] = useState('');

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editReps, setEditReps] = useState('');
  const [editWeight, setEditWeight] = useState('');
  const [editRpe, setEditRpe] = useState('');
  const [showGuide, setShowGuide] = useState(false);
  const guide = findExerciseGuide(exercise.name);

  const handleAdd = () => {
    if (!reps || !weight) return;
    onAddSet({
      reps: Math.round(num(reps)),
      weightKg: displayToKg(num(weight), weightUnit),
      rpe: rpeEnabled && rpe ? num(rpe) : null,
    });
    setReps('');
    setWeight('');
    setRpe('');
  };

  const startEdit = (index: number, set: DraftSet) => {
    setEditingIndex(index);
    setEditReps(String(set.reps));
    setEditWeight(String(Math.round(kgToDisplay(set.weightKg, weightUnit) * 10) / 10));
    setEditRpe(set.rpe != null ? String(set.rpe) : '');
  };

  const saveEdit = () => {
    if (editingIndex === null || !editReps || !editWeight) return;
    onEditSet(editingIndex, {
      reps: Math.round(num(editReps)),
      weightKg: displayToKg(num(editWeight), weightUnit),
      rpe: rpeEnabled && editRpe ? num(editRpe) : null,
    });
    Keyboard.dismiss();
    setEditingIndex(null);
  };

  const confirmRemove = (index: number) => {
    Alert.alert(t.seance.deleteSetConfirmTitle, undefined, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.common.delete,
        style: 'destructive',
        onPress: () => {
          if (editingIndex === index) setEditingIndex(null);
          onRemoveSet(index);
        },
      },
    ]);
  };

  const confirmRemoveExercise = () => {
    Alert.alert(
      t.seance.removeExerciseConfirmTitle,
      draftSets.length > 0 ? t.seance.removeExerciseConfirmBody(draftSets.length) : undefined,
      [
        { text: t.common.cancel, style: 'cancel' },
        { text: t.common.delete, style: 'destructive', onPress: onRemoveExercise },
      ]
    );
  };

  const canCollapse = draftSets.length > 0;
  const recordBeaten = !!bestWeightKg && draftSets.some((s) => s.weightKg >= bestWeightKg);

  const banner = (
    <Pressable
      onPress={canCollapse ? onToggleValidated : undefined}
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: colors.accent,
        borderRadius: Radius.md,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
        opacity: canCollapse ? 1 : 0.6,
      }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <ThemedText variant="headline" weight="700" style={{ color: '#FFFFFF' }}>
          {exercise.name}
        </ThemedText>
        {!!bestWeightKg && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons
              name="barbell-outline"
              size={13}
              color={recordBeaten ? '#FFFFFF' : 'rgba(255,255,255,0.8)'}
            />
            <ThemedText
              variant="caption"
              weight={recordBeaten ? '700' : '600'}
              style={{ color: recordBeaten ? '#FFFFFF' : 'rgba(255,255,255,0.8)' }}
            >
              {recordBeaten
                ? t.seance.bestWeightBeaten
                : `${t.seance.bestWeight} : ${formatWeight(bestWeightKg, weightUnit)}`}
            </ThemedText>
          </View>
        )}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {draftSets.length > 0 && (
          <ThemedText variant="footnote" weight="600" style={{ color: '#FFFFFF' }}>
            {draftSets.length}
          </ThemedText>
        )}
        {canCollapse && (
          <Ionicons name={validated ? 'chevron-down' : 'chevron-up'} size={20} color="#FFFFFF" />
        )}
      </View>
    </Pressable>
  );

  if (validated) {
    const last = draftSets[draftSets.length - 1];
    return (
      <View style={{ gap: 0 }}>
        {banner}
        <View
          style={{
            backgroundColor: colors.card,
            borderWidth: 1,
            borderTopWidth: 0,
            borderColor: colors.border,
            borderBottomLeftRadius: Radius.lg,
            borderBottomRightRadius: Radius.lg,
            padding: Spacing.md,
          }}
        >
          <ThemedText variant="subhead" color="secondary">
            {t.seance.lastSet} : {last.reps} {t.common.reps.toLowerCase()} × {formatWeight(last.weightKg, weightUnit)}
          </ThemedText>
        </View>
      </View>
    );
  }

  return (
    <View style={{ gap: 0 }}>
      {banner}
      <View
        style={{
          backgroundColor: colors.card,
          borderWidth: 1,
          borderTopWidth: 0,
          borderColor: colors.border,
          borderBottomLeftRadius: Radius.lg,
          borderBottomRightRadius: Radius.lg,
          padding: Spacing.md,
          gap: Spacing.sm,
        }}
      >
        {guide && (
          <View>
            <Pressable
              onPress={() => setShowGuide((v) => !v)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 2 }}
            >
              <Ionicons name="information-circle-outline" size={16} color={colors.accent} />
              <ThemedText variant="footnote" weight="600" color="accent" style={{ flex: 1 }}>
                {t.seance.howToPerform}
              </ThemedText>
              <Ionicons
                name={showGuide ? 'chevron-up' : 'chevron-down'}
                size={14}
                color={colors.textTertiary}
              />
            </Pressable>
            {showGuide && (
              <View style={{ gap: 4, paddingTop: 4, paddingBottom: 2 }}>
                {guide.cues.map((cue, i) => (
                  <ThemedText key={i} variant="footnote" color="secondary">
                    {'•'} {cue}
                  </ThemedText>
                ))}
              </View>
            )}
          </View>
        )}
        {draftSets.map((s, i) =>
          editingIndex === i ? (
            <View key={i} style={{ gap: Spacing.sm }}>
              <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <ThemedText variant="caption" color="tertiary">
                    {t.common.reps}
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
                    {t.profil.weight} ({weightUnit})
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
                <Button title={t.common.save} onPress={saveEdit} style={{ flex: 1 }} />
                <IconButton name="close" onPress={() => setEditingIndex(null)} />
              </View>
            </View>
          ) : (
            <View
              key={i}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Pressable onPress={() => startEdit(i, s)} style={{ flex: 1, paddingVertical: Spacing.sm }}>
                <ThemedText variant="subhead" color="secondary">
                  {t.seance.setLabel(i + 1)} · {s.reps} {t.common.reps.toLowerCase()} × {formatWeight(s.weightKg, weightUnit)}
                  {s.rpe ? ` · RPE ${s.rpe}` : ''}
                </ThemedText>
              </Pressable>
              <IconButton name="trash-outline" variant="destructive" size={18} onPress={() => confirmRemove(i)} />
            </View>
          )
        )}

        <View style={{ flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-end' }}>
          <View style={{ flex: 1 }}>
            <ThemedText variant="caption" color="tertiary">
              Reps
            </ThemedText>
            <Input
              keyboardType="number-pad"
              value={reps}
              onChangeText={setReps}
              placeholder="0"
              returnKeyType="done"
              onSubmitEditing={Keyboard.dismiss}
            />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText variant="caption" color="tertiary">
              Poids ({weightUnit})
            </ThemedText>
            <Input
              keyboardType="decimal-pad"
              value={weight}
              onChangeText={setWeight}
              placeholder="0"
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
                value={rpe}
                onChangeText={setRpe}
                placeholder="opt."
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
              />
            </View>
          )}
          <Pressable
            onPress={handleAdd}
            style={{
              width: 44,
              height: 44,
              borderRadius: Radius.sm,
              backgroundColor: colors.accent,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </Pressable>
        </View>

        <Button title={t.seance.removeExerciseFromSession} variant="destructive" onPress={confirmRemoveExercise} />
      </View>
    </View>
  );
}
