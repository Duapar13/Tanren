import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '../ThemedText';
import { ThemedView } from '../ThemedView';
import { Input } from '../Input';
import { IconButton } from '../IconButton';
import { SegmentedControl } from '../SegmentedControl';
import { EmptyState } from '../EmptyState';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../hooks/useTranslation';
import { Radius, Spacing } from '../../constants/theme';
import { Exercise } from '../../types';

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Already filtered to what can be picked, most relevant first. */
  exercises: Exercise[];
  onPick: (exerciseId: number) => void;
  onCreate: (name: string, category: 'upper' | 'lower') => Promise<void>;
}

/** Full-height sheet to search the exercise library, or create a new exercise on the spot. */
export function ExercisePickerSheet({ visible, onClose, exercises, onPick, onCreate }: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'upper' | 'lower'>('all');

  const trimmed = query.trim();
  const results = useMemo(() => {
    const needle = trimmed.toLowerCase();
    return exercises.filter(
      (e) => (filter === 'all' || e.category === filter) && (!needle || e.name.toLowerCase().includes(needle))
    );
  }, [exercises, trimmed, filter]);

  const canCreate =
    trimmed.length > 0 && !exercises.some((e) => e.name.trim().toLowerCase() === trimmed.toLowerCase());

  const close = () => {
    setQuery('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
      <ThemedView variant="grouped" style={{ flex: 1 }}>
        <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
          <View style={{ padding: Spacing.lg, gap: Spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
              <ThemedText variant="title2" style={{ flex: 1 }}>
                {t.session.addExercise}
              </ThemedText>
              <IconButton name="close" onPress={close} />
            </View>
            <Input
              value={query}
              onChangeText={setQuery}
              placeholder={t.session.searchExercise}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
            <SegmentedControl
              options={[
                { label: t.seance.all, value: 'all' as const },
                { label: t.seance.upperShort, value: 'upper' as const },
                { label: t.seance.lowerShort, value: 'lower' as const },
              ]}
              value={filter}
              onChange={setFilter}
            />
          </View>

          <FlatList
            data={results}
            keyExtractor={(e) => String(e.id)}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, gap: Spacing.sm }}
            ListHeaderComponent={
              canCreate ? (
                <Pressable
                  onPress={async () => {
                    await onCreate(trimmed, filter === 'lower' ? 'lower' : 'upper');
                    close();
                  }}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: Spacing.md,
                    padding: Spacing.md,
                    borderRadius: Radius.lg,
                    backgroundColor: colors.accentSoft,
                    borderWidth: 1,
                    borderColor: colors.accent + '4D',
                    opacity: pressed ? 0.75 : 1,
                    marginBottom: Spacing.xs,
                  })}
                >
                  <Ionicons name="add-circle" size={22} color={colors.accent} />
                  <ThemedText variant="subhead" weight="700" color="accent" style={{ flex: 1 }} numberOfLines={1}>
                    {t.session.createExercise(trimmed)}
                  </ThemedText>
                </Pressable>
              ) : null
            }
            ListEmptyComponent={!canCreate ? <EmptyState icon="search-outline" text={t.exerciseCatalog.noResults} /> : null}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  onPick(item.id);
                  close();
                }}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: Spacing.md,
                  minHeight: 60,
                  padding: Spacing.md,
                  borderRadius: Radius.lg,
                  backgroundColor: colors.card,
                  borderWidth: 1,
                  borderColor: colors.border,
                  opacity: pressed ? 0.75 : 1,
                })}
              >
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 12,
                    backgroundColor: colors.accentSoft,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name={item.category === 'upper' ? 'barbell' : 'walk'} size={18} color={colors.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText variant="subhead" weight="700" numberOfLines={1}>
                    {item.name}
                  </ThemedText>
                  <ThemedText variant="footnote" color="tertiary">
                    {item.category === 'upper' ? t.common.upperBody : t.common.lowerBody}
                  </ThemedText>
                </View>
                <Ionicons name="add" size={20} color={colors.textTertiary} />
              </Pressable>
            )}
          />
        </SafeAreaView>
      </ThemedView>
    </Modal>
  );
}
