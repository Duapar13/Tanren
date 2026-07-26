import { useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '../../components/ScreenHeader';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { SegmentedControl } from '../../components/SegmentedControl';
import { BackupControls } from '../../components/BackupControls';
import { useData } from '../../context/DataContext';
import { useTheme } from '../../hooks/useTheme';
import { Spacing } from '../../constants/theme';
import { MUSCLE_GROUP_LABELS, MuscleGroup } from '../../types';

const UPPER_GROUPS: MuscleGroup[] = ['pecs', 'dos', 'epaules', 'bras'];
const LOWER_GROUPS: MuscleGroup[] = ['quadriceps', 'ischios', 'fessiers', 'mollets'];

export default function ProfilScreen() {
  const { exercises, addExercise, removeExercise } = useData();
  const { colors } = useTheme();

  const [showAddExercise, setShowAddExercise] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<'upper' | 'lower'>('upper');
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroup>('pecs');

  const groupsForCategory = category === 'upper' ? UPPER_GROUPS : LOWER_GROUPS;

  const handleAddExercise = async () => {
    if (!name.trim()) return;
    await addExercise({
      name: name.trim(),
      category,
      muscleGroup,
      isCustom: true,
    });
    setName('');
    setShowAddExercise(false);
  };

  const handleDeleteExercise = (id: number, exName: string) => {
    Alert.alert('Supprimer l’exercice', exName, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => removeExercise(id) },
    ]);
  };

  const customExercises = exercises.filter((e) => e.isCustom);

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
          <View>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: Spacing.sm,
              }}
            >
              <ThemedText variant="headline">Bibliothèque d’exercices</ThemedText>
              <Pressable onPress={() => setShowAddExercise((v) => !v)}>
                <Ionicons name="add-circle" size={26} color={colors.accent} />
              </Pressable>
            </View>

            {showAddExercise && (
              <Card style={{ gap: Spacing.sm, marginBottom: Spacing.sm }}>
                <Input placeholder="Nom de l’exercice" value={name} onChangeText={setName} />
                <SegmentedControl
                  options={[
                    { label: 'Haut', value: 'upper' as const },
                    { label: 'Bas', value: 'lower' as const },
                  ]}
                  value={category}
                  onChange={(v) => {
                    setCategory(v);
                    setMuscleGroup(v === 'upper' ? 'pecs' : 'quadriceps');
                  }}
                />
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {groupsForCategory.map((g) => {
                    const selected = g === muscleGroup;
                    return (
                      <Pressable
                        key={g}
                        onPress={() => setMuscleGroup(g)}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 999,
                          backgroundColor: selected ? colors.accent : colors.fill,
                        }}
                      >
                        <ThemedText
                          variant="footnote"
                          weight="600"
                          style={{ color: selected ? '#FFFFFF' : colors.text }}
                        >
                          {MUSCLE_GROUP_LABELS[g]}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
                <Button title="Ajouter à la bibliothèque" onPress={handleAddExercise} />
              </Card>
            )}

            {customExercises.length > 0 && (
              <Card style={{ gap: 0 }}>
                {customExercises.map((ex) => (
                  <View
                    key={ex.id}
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingVertical: Spacing.xs,
                    }}
                  >
                    <View>
                      <ThemedText variant="subhead">{ex.name}</ThemedText>
                      <ThemedText variant="caption" color="tertiary">
                        {MUSCLE_GROUP_LABELS[ex.muscleGroup]}
                      </ThemedText>
                    </View>
                    <Pressable onPress={() => handleDeleteExercise(ex.id, ex.name)}>
                      <Ionicons name="trash-outline" size={18} color={colors.textTertiary} />
                    </Pressable>
                  </View>
                ))}
              </Card>
            )}
          </View>

          <BackupControls />
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}
