import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '../components/ThemedText';
import { ThemedView } from '../components/ThemedView';
import { Input } from '../components/Input';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import { Radius, Spacing } from '../constants/theme';
import { CatalogEntry, CatalogMeta, getCatalogMeta, searchCatalog } from '../lib/exerciseCatalog';
import { bodyPartLabel, equipmentLabel } from '../constants/exerciseCatalogLabels';

function capitalize(s: string) {
  return s.length ? s[0].toUpperCase() + s.slice(1) : s;
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: active ? colors.accent : colors.fill,
        marginRight: 6,
      }}
    >
      <ThemedText variant="footnote" weight="600" style={{ color: active ? '#FFFFFF' : colors.text }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

export default function ExerciseCatalogScreen() {
  const { colors } = useTheme();
  const { t, lang } = useTranslation();
  const [search, setSearch] = useState('');
  const [bodyPart, setBodyPart] = useState<string | null>(null);
  const [meta, setMeta] = useState<CatalogMeta | null>(null);
  const [results, setResults] = useState<CatalogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCatalogMeta().then(setMeta).catch(() => {});
  }, []);

  const runSearch = useCallback(() => {
    setLoading(true);
    searchCatalog({ search: search.trim() || undefined, bodyPart: bodyPart ?? undefined, limit: 50 })
      .then(setResults)
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, [search, bodyPart]);

  useEffect(() => {
    const id = setTimeout(runSearch, 300); // debounce typing
    return () => clearTimeout(id);
  }, [runSearch]);

  return (
    <ThemedView variant="grouped" style={{ flex: 1 }}>
      <View style={{ padding: Spacing.lg, gap: Spacing.sm }}>
        <Input
          value={search}
          onChangeText={setSearch}
          placeholder={t.exerciseCatalog.searchPlaceholder}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {meta && (
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={[null, ...meta.bodyParts]}
            keyExtractor={(item) => item ?? 'all'}
            renderItem={({ item }) => (
              <Chip
                label={item ? capitalize(bodyPartLabel(item, lang)) : t.exerciseCatalog.filterAll}
                active={bodyPart === item}
                onPress={() => setBodyPart(item)}
              />
            )}
          />
        )}
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: Spacing.lg, paddingTop: 0, gap: Spacing.sm }}
        ListEmptyComponent={
          !loading ? (
            <ThemedText variant="subhead" color="tertiary" style={{ textAlign: 'center', marginTop: Spacing.xxl }}>
              {t.exerciseCatalog.noResults}
            </ThemedText>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push({ pathname: '/exercise-catalog-detail', params: { id: String(item.id) } })}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: Spacing.md,
              borderRadius: Radius.md,
              backgroundColor: colors.card,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <View style={{ flex: 1 }}>
              <ThemedText variant="subhead" weight="600" style={{ textTransform: 'capitalize' }}>
                {item.name}
              </ThemedText>
              <ThemedText variant="caption" color="tertiary">
                {capitalize(bodyPartLabel(item.bodyPart, lang))} · {equipmentLabel(item.equipment, lang)}
              </ThemedText>
            </View>
          </Pressable>
        )}
      />
    </ThemedView>
  );
}
