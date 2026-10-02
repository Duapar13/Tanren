import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { EmptyState } from '../components/EmptyState';
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
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: active ? colors.accent : colors.fill,
        borderWidth: 1,
        borderColor: active ? colors.accent : colors.border,
        marginRight: 8,
      }}
    >
      <ThemedText variant="footnote" weight="600" style={{ color: active ? colors.onAccent : colors.textSecondary }}>
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
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    getCatalogMeta().then(setMeta).catch(() => {});
  }, []);

  const runSearch = useCallback(() => {
    setLoading(true);
    setFailed(false);
    searchCatalog({ search: search.trim() || undefined, bodyPart: bodyPart ?? undefined, limit: 50 })
      .then(setResults)
      .catch(() => {
        setResults([]);
        setFailed(true);
      })
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
            <EmptyState
              icon={failed ? 'cloud-offline-outline' : 'search-outline'}
              text={failed ? t.sync.requiresInternet : t.exerciseCatalog.noResults}
            />
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push({ pathname: '/exercise-catalog-detail', params: { id: String(item.id) } })}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: Spacing.md,
              minHeight: 64,
              padding: Spacing.md,
              borderRadius: Radius.lg,
              backgroundColor: colors.card,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                backgroundColor: colors.accentSoft,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="play" size={16} color={colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText variant="subhead" weight="700" style={{ textTransform: 'capitalize' }}>
                {item.name}
              </ThemedText>
              <ThemedText variant="caption" color="tertiary">
                {capitalize(bodyPartLabel(item.bodyPart, lang))} · {equipmentLabel(item.equipment, lang)}
              </ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </Pressable>
        )}
      />
    </ThemedView>
  );
}
