import { useState } from 'react';
import { Alert, Keyboard, ScrollView, View, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '../components/ThemedText';
import { ThemedView } from '../components/ThemedView';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { IconButton } from '../components/IconButton';
import { SegmentedControl } from '../components/SegmentedControl';
import { useData } from '../context/DataContext';
import { useTranslation } from '../hooks/useTranslation';
import { useTheme } from '../hooks/useTheme';
import { Spacing } from '../constants/theme';
import { Exercise } from '../types';

export default function ExerciseLibraryScreen() {
  const { exercises, addExercise, updateExercise, removeExercise } = useData();
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [showAddExercise, setShowAddExercise] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<'upper' | 'lower'>('upper');

  const [editingExerciseId, setEditingExerciseId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState<'upper' | 'lower'>('upper');

  const handleAddExercise = async () => {
    if (!name.trim()) return;
    await addExercise({
      name: name.trim(),
      category,
      muscleGroup: category === 'upper' ? 'pecs' : 'quadriceps',
      isCustom: true,
    });
    setName('');
    setShowAddExercise(false);
  };

  const handleDeleteExercise = (id: number, exName: string) => {
    Alert.alert(t.profil.deleteExerciseConfirmTitle, exName, [
      { text: t.common.cancel, style: 'cancel' },
      { text: t.common.delete, style: 'destructive', onPress: () => removeExercise(id) },
    ]);
  };

  const startEditExercise = (ex: Exercise) => {
    setEditingExerciseId(ex.id);
    setEditName(ex.name);
    setEditCategory(ex.category);
  };

  const saveEditExercise = async () => {
    if (editingExerciseId === null || !editName.trim()) return;
    Keyboard.dismiss();
    await updateExercise(editingExerciseId, { name: editName.trim(), category: editCategory });
    setEditingExerciseId(null);
  };

  const customExercises = exercises.filter((e) => e.isCustom);

  return (
    <ThemedView variant="grouped" style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{
          padding: Spacing.lg,
          gap: Spacing.sm,
          paddingBottom: Spacing.xxl,
        }}
      >
        {showAddExercise ? (
          <Card style={{ gap: Spacing.sm }}>
            <Input placeholder={t.profil.exerciseNamePlaceholder} value={name} onChangeText={setName} />
            <SegmentedControl
              options={[
                { label: t.common.upperBody, value: 'upper' as const },
                { label: t.common.lowerBody, value: 'lower' as const },
              ]}
              value={category}
              onChange={setCategory}
            />
            <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
              <Button title={t.common.add} onPress={handleAddExercise} style={{ flex: 1 }} />
              <IconButton name="close" onPress={() => setShowAddExercise(false)} />
            </View>
          </Card>
        ) : (
          <View style={{ gap: Spacing.sm }}>
            <Pressable
              onPress={() => router.push('/exercise-catalog')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: Spacing.sm,
                padding: Spacing.md,
                borderRadius: 12,
                backgroundColor: colors.accent + '14',
                borderWidth: 1,
                borderColor: colors.accent + '40',
              }}
            >
              <Ionicons name="film-outline" size={20} color={colors.accent} />
              <View style={{ flex: 1 }}>
                <ThemedText variant="subhead" weight="600" color="accent">
                  {t.exerciseCatalog.browseButton}
                </ThemedText>
                <ThemedText variant="caption" color="tertiary">
                  {t.exerciseCatalog.browseButtonHint}
                </ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.accent} />
            </Pressable>
            <Button title={t.seance.addExercise} onPress={() => setShowAddExercise(true)} />
          </View>
        )}

        {customExercises.length === 0 && !showAddExercise && (
          <ThemedText variant="caption" color="tertiary" style={{ textAlign: 'center', marginTop: Spacing.md }}>
            {t.profil.noCustomExercises}
          </ThemedText>
        )}

        {customExercises.map((ex) =>
          editingExerciseId === ex.id ? (
            <Card key={ex.id} style={{ gap: Spacing.sm }}>
              <Input value={editName} onChangeText={setEditName} />
              <SegmentedControl
                options={[
                  { label: t.common.upperBody, value: 'upper' as const },
                  { label: t.common.lowerBody, value: 'lower' as const },
                ]}
                value={editCategory}
                onChange={setEditCategory}
              />
              <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                <Button title={t.common.save} onPress={saveEditExercise} style={{ flex: 1 }} />
                <IconButton name="close" onPress={() => setEditingExerciseId(null)} />
              </View>
            </Card>
          ) : (
            <Card
              key={ex.id}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <Pressable onPress={() => startEditExercise(ex)} style={{ flex: 1 }}>
                <ThemedText variant="subhead" weight="600">
                  {ex.name}
                </ThemedText>
                <ThemedText variant="caption" color="tertiary">
                  {ex.category === 'upper' ? t.common.upperBody : t.common.lowerBody}
                </ThemedText>
              </Pressable>
              <View style={{ flexDirection: 'row', gap: Spacing.xs }}>
                <IconButton name="pencil-outline" size={18} onPress={() => startEditExercise(ex)} />
                <IconButton
                  name="trash-outline"
                  variant="destructive"
                  size={18}
                  onPress={() => handleDeleteExercise(ex.id, ex.name)}
                />
              </View>
            </Card>
          )
        )}
      </ScrollView>
    </ThemedView>
  );
}
