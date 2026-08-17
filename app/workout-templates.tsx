import { useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { ThemedText } from '../components/ThemedText';
import { ThemedView } from '../components/ThemedView';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { IconButton } from '../components/IconButton';
import { useData } from '../context/DataContext';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import { Spacing, Radius } from '../constants/theme';

export default function WorkoutTemplatesScreen() {
  const { exercises, workoutTemplates, addWorkoutTemplate, removeWorkoutTemplate } = useData();
  const { colors } = useTheme();
  const { t } = useTranslation();

  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const activeExercises = exercises.filter((e) => !e.deletedAt);

  const toggleExercise = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const resetCreateForm = () => {
    setShowCreate(false);
    setName('');
    setSelectedIds(new Set());
  };

  const handleCreate = async () => {
    if (!name.trim() || selectedIds.size === 0) return;
    await addWorkoutTemplate({ name: name.trim(), exerciseIds: Array.from(selectedIds) });
    resetCreateForm();
  };

  const handleDelete = (id: number, templateName: string) => {
    Alert.alert(t.workoutTemplates.deleteConfirmTitle, templateName, [
      { text: t.common.cancel, style: 'cancel' },
      { text: t.common.delete, style: 'destructive', onPress: () => removeWorkoutTemplate(id) },
    ]);
  };

  return (
    <ThemedView variant="grouped" style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.sm, paddingBottom: Spacing.xxl }}
      >
        {showCreate ? (
          <Card style={{ gap: Spacing.sm }}>
            <Input placeholder={t.workoutTemplates.namePlaceholder} value={name} onChangeText={setName} />
            <ThemedText variant="caption" color="tertiary">
              {t.workoutTemplates.selectExercisesHint}
            </ThemedText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {activeExercises.map((ex) => {
                const selected = selectedIds.has(ex.id);
                return (
                  <Pressable
                    key={ex.id}
                    onPress={() => toggleExercise(ex.id)}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: Radius.pill,
                      backgroundColor: selected ? colors.accent : colors.fill,
                    }}
                  >
                    <ThemedText
                      variant="subhead"
                      weight="600"
                      style={{ color: selected ? '#FFFFFF' : colors.text }}
                    >
                      {ex.name}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
            <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
              <Button
                title={t.workoutTemplates.createButton}
                onPress={handleCreate}
                disabled={!name.trim() || selectedIds.size === 0}
                style={{ flex: 1 }}
              />
              <IconButton name="close" onPress={resetCreateForm} />
            </View>
          </Card>
        ) : (
          <Button title={t.workoutTemplates.newTemplate} onPress={() => setShowCreate(true)} />
        )}

        {workoutTemplates.length === 0 && !showCreate && (
          <ThemedText variant="caption" color="tertiary" style={{ textAlign: 'center', marginTop: Spacing.md }}>
            {t.workoutTemplates.emptyState}
          </ThemedText>
        )}

        {workoutTemplates.map((tpl) => (
          <Card key={tpl.id} style={{ gap: Spacing.xs }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <ThemedText variant="subhead" weight="600">
                {tpl.name}
              </ThemedText>
              <IconButton
                name="trash-outline"
                variant="destructive"
                size={18}
                onPress={() => handleDelete(tpl.id, tpl.name)}
              />
            </View>
            <ThemedText variant="caption" color="tertiary">
              {tpl.exerciseIds
                .map((id) => exercises.find((e) => e.id === id)?.name)
                .filter(Boolean)
                .join(', ')}
            </ThemedText>
          </Card>
        ))}
      </ScrollView>
    </ThemedView>
  );
}
