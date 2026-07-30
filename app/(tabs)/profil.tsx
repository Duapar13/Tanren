import { useEffect, useState } from 'react';
import { Alert, Keyboard, Pressable, ScrollView, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../components/ScreenHeader';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { IconButton } from '../../components/IconButton';
import { SegmentedControl } from '../../components/SegmentedControl';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../hooks/useTheme';
import { Spacing } from '../../constants/theme';
import { Exercise, NutritionGoal, SplitType } from '../../types';

const REST_DURATIONS = [60, 90, 120, 180];
// Short forms so all three fit on one line in the segmented control (full names in utils/nutrition.ts's GOAL_LABELS).
const GOAL_OPTIONS: { label: string; value: NutritionGoal }[] = [
  { label: 'Masse', value: 'bulk' },
  { label: 'Sèche', value: 'cut' },
  { label: 'Maintien', value: 'maintain' },
];

const SPLIT_TYPE_OPTIONS: { label: string; value: SplitType }[] = [
  { label: 'Haut / Bas', value: 'upper_lower' },
  { label: 'Push Pull Legs', value: 'ppl' },
];

// Lundi en premier pour matcher WeekStrip/CalendarHeatmap ; dow = index JS (0=dimanche..6=samedi).
const WEEKDAYS: { label: string; dow: number }[] = [
  { label: 'L', dow: 1 },
  { label: 'M', dow: 2 },
  { label: 'M', dow: 3 },
  { label: 'J', dow: 4 },
  { label: 'V', dow: 5 },
  { label: 'S', dow: 6 },
  { label: 'D', dow: 0 },
];

export default function ProfilScreen() {
  const { exercises, addExercise, updateExercise, removeExercise } = useData();
  const { user, updateProfile, logout } = useAuth();
  const { colors } = useTheme();

  const handleLogout = () => {
    Alert.alert('Se déconnecter ?', undefined, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Se déconnecter', style: 'destructive', onPress: () => logout() },
    ]);
  };

  const [showAddExercise, setShowAddExercise] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<'upper' | 'lower'>('upper');

  const [editingExerciseId, setEditingExerciseId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState<'upper' | 'lower'>('upper');

  const [heightInput, setHeightInput] = useState(user?.heightCm ? String(user.heightCm) : '');
  useEffect(() => {
    setHeightInput(user?.heightCm ? String(user.heightCm) : '');
  }, [user?.heightCm]);

  const saveHeight = () => {
    Keyboard.dismiss();
    const cm = parseFloat(heightInput.replace(',', '.'));
    if (Number.isFinite(cm) && cm > 0) updateProfile({ heightCm: cm });
  };

  const toggleTrainingDay = (dow: number) => {
    const current = user?.trainingDays ?? [];
    const next = current.includes(dow) ? current.filter((d) => d !== dow) : [...current, dow];
    updateProfile({ trainingDays: next });
  };

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
    Alert.alert('Supprimer l’exercice', exName, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => removeExercise(id) },
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
            <ThemedText variant="headline" style={{ marginBottom: Spacing.sm }}>
              Compte
            </ThemedText>
            <Card style={{ gap: Spacing.xs }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <ThemedText variant="subhead" weight="600">
                    {user?.displayName ?? user?.username}
                  </ThemedText>
                  <ThemedText variant="caption" color="tertiary">
                    {user?.email}
                  </ThemedText>
                </View>
                <Pressable onPress={handleLogout}>
                  <ThemedText variant="footnote" weight="600" style={{ color: colors.negative }}>
                    Se déconnecter
                  </ThemedText>
                </Pressable>
              </View>
            </Card>
          </View>

          <View>
            <ThemedText variant="headline" style={{ marginBottom: Spacing.sm }}>
              Corps &amp; objectif
            </ThemedText>
            <Card style={{ gap: Spacing.md }}>
              <View>
                <ThemedText variant="caption" color="tertiary">
                  Taille (cm)
                </ThemedText>
                <Input
                  keyboardType="decimal-pad"
                  value={heightInput}
                  onChangeText={setHeightInput}
                  onSubmitEditing={saveHeight}
                  onEndEditing={saveHeight}
                  returnKeyType="done"
                  placeholder="ex. 178"
                />
              </View>
              <View>
                <ThemedText variant="caption" color="tertiary" style={{ marginBottom: 6 }}>
                  Objectif
                </ThemedText>
                <SegmentedControl
                  options={GOAL_OPTIONS}
                  value={user?.goal ?? 'maintain'}
                  onChange={(goal) => updateProfile({ goal })}
                />
              </View>
            </Card>
          </View>

          <View>
            <ThemedText variant="headline" style={{ marginBottom: Spacing.sm }}>
              Programme
            </ThemedText>
            <Card style={{ gap: Spacing.md }}>
              <View>
                <ThemedText variant="caption" color="tertiary" style={{ marginBottom: 6 }}>
                  Jours d’entraînement
                </ThemedText>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {WEEKDAYS.map(({ label, dow }) => {
                    const selected = (user?.trainingDays ?? []).includes(dow);
                    return (
                      <Pressable
                        key={dow}
                        onPress={() => toggleTrainingDay(dow)}
                        style={{
                          flex: 1,
                          aspectRatio: 1,
                          borderRadius: 999,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: selected ? colors.accent : colors.fill,
                        }}
                      >
                        <ThemedText
                          variant="subhead"
                          weight="600"
                          style={{ color: selected ? '#FFFFFF' : colors.text }}
                        >
                          {label}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
              <View>
                <ThemedText variant="caption" color="tertiary" style={{ marginBottom: 6 }}>
                  Type de split
                </ThemedText>
                <SegmentedControl
                  options={SPLIT_TYPE_OPTIONS}
                  value={user?.splitType ?? 'upper_lower'}
                  onChange={(splitType) => updateProfile({ splitType })}
                />
              </View>
            </Card>
          </View>

          <View>
            <ThemedText variant="headline" style={{ marginBottom: Spacing.sm }}>
              Séance
            </ThemedText>
            <Card style={{ gap: Spacing.md }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <ThemedText variant="subhead">Timer de repos</ThemedText>
                  <ThemedText variant="caption" color="tertiary">
                    Décompte affiché après chaque série ajoutée
                  </ThemedText>
                </View>
                <Switch
                  value={user?.restTimerEnabled ?? false}
                  onValueChange={(v) => updateProfile({ restTimerEnabled: v })}
                  trackColor={{ true: colors.accent }}
                />
              </View>

              {user?.restTimerEnabled && (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {REST_DURATIONS.map((d) => {
                    const selected = user.restTimerSeconds === d;
                    return (
                      <Pressable
                        key={d}
                        onPress={() => updateProfile({ restTimerSeconds: d })}
                        style={{
                          flex: 1,
                          paddingVertical: 8,
                          borderRadius: 999,
                          alignItems: 'center',
                          backgroundColor: selected ? colors.accent : colors.fill,
                        }}
                      >
                        <ThemedText
                          variant="footnote"
                          weight="600"
                          style={{ color: selected ? '#FFFFFF' : colors.text }}
                        >
                          {d}s
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
              )}

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <ThemedText variant="subhead">RPE</ThemedText>
                  <ThemedText variant="caption" color="tertiary">
                    Champ d’intensité perçue (1-10) sur chaque série
                  </ThemedText>
                </View>
                <Switch
                  value={user?.rpeEnabled ?? false}
                  onValueChange={(v) => updateProfile({ rpeEnabled: v })}
                  trackColor={{ true: colors.accent }}
                />
              </View>
            </Card>
          </View>

          <View>
            <ThemedText variant="headline" style={{ marginBottom: Spacing.sm }}>
              Mensurations
            </ThemedText>
            <Card style={{ gap: Spacing.md }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <ThemedText variant="subhead">Suivi des mensurations</ThemedText>
                  <ThemedText variant="caption" color="tertiary">
                    Bras, taille, torse, cuisses — affiche le suivi dans Nutrition et compte dans les points de rang
                  </ThemedText>
                </View>
                <Switch
                  value={user?.measurementsEnabled ?? false}
                  onValueChange={(v) => updateProfile({ measurementsEnabled: v })}
                  trackColor={{ true: colors.accent }}
                />
              </View>
            </Card>
          </View>

          <View style={{ gap: Spacing.sm }}>
            <ThemedText variant="headline">Bibliothèque d’exercices</ThemedText>

            {showAddExercise ? (
              <Card style={{ gap: Spacing.sm }}>
                <Input placeholder="Nom de l’exercice" value={name} onChangeText={setName} />
                <SegmentedControl
                  options={[
                    { label: 'Haut du corps', value: 'upper' as const },
                    { label: 'Bas du corps', value: 'lower' as const },
                  ]}
                  value={category}
                  onChange={setCategory}
                />
                <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                  <Button title="Ajouter" onPress={handleAddExercise} style={{ flex: 1 }} />
                  <IconButton name="close" onPress={() => setShowAddExercise(false)} />
                </View>
              </Card>
            ) : (
              <Button title="Ajouter un exercice" onPress={() => setShowAddExercise(true)} />
            )}

            {customExercises.map((ex) =>
              editingExerciseId === ex.id ? (
                <Card key={ex.id} style={{ gap: Spacing.sm }}>
                  <Input value={editName} onChangeText={setEditName} />
                  <SegmentedControl
                    options={[
                      { label: 'Haut du corps', value: 'upper' as const },
                      { label: 'Bas du corps', value: 'lower' as const },
                    ]}
                    value={editCategory}
                    onChange={setEditCategory}
                  />
                  <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                    <Button title="Enregistrer" onPress={saveEditExercise} style={{ flex: 1 }} />
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
                      {ex.category === 'upper' ? 'Haut du corps' : 'Bas du corps'}
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
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}
