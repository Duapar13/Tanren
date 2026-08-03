import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '../components/ThemedText';
import { ThemedView } from '../components/ThemedView';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { SegmentedControl } from '../components/SegmentedControl';
import { useData } from '../context/DataContext';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import { Radius, Spacing } from '../constants/theme';
import { fetchProductByBarcode, OFFProduct, searchProducts } from '../lib/openFoodFacts';
import { todayKey } from '../utils/date';

type Mode = 'scan' | 'search' | 'recent';

/** Reconstructs a per-100 "product" from past logged entries so a previously eaten food can
 * be re-added the same way a scanned/searched one is — most recent occurrence per distinct
 * name wins, and only entries with a name+grams (i.e. from this same screen) qualify. */
function recentFoodsFromEntries(entries: { foodName: string | null; grams: number | null; unit: 'g' | 'ml' | null; barcode: string | null; proteinG: number; carbsG: number; fatG: number }[]): OFFProduct[] {
  const seen = new Set<string>();
  const results: OFFProduct[] = [];
  for (const e of entries) {
    if (!e.foodName || !e.grams || e.grams <= 0) continue;
    const key = e.foodName.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    results.push({
      barcode: e.barcode ?? '',
      name: e.foodName,
      proteinPer100g: Math.round(((e.proteinG / e.grams) * 100) * 10) / 10,
      carbsPer100g: Math.round(((e.carbsG / e.grams) * 100) * 10) / 10,
      fatPer100g: Math.round(((e.fatG / e.grams) * 100) * 10) / 10,
      unit: e.unit === 'ml' ? 'ml' : 'g',
    });
    if (results.length >= 20) break;
  }
  return results;
}

export default function FoodSearchScreen() {
  const { addNutritionEntry, nutritionEntries } = useData();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const recentFoods = recentFoodsFromEntries(nutritionEntries);
  const [mode, setMode] = useState<Mode>('scan');
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<OFFProduct[]>([]);
  const [searching, setSearching] = useState(false);

  const [selected, setSelected] = useState<OFFProduct | null>(null);
  const [gramsInput, setGramsInput] = useState('100');

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (!scanning) return;
    setScanning(false);
    setLoading(true);
    setError(null);
    try {
      const product = await fetchProductByBarcode(data);
      if (product) {
        setSelected(product);
      } else {
        setError(t.foodSearch.productNotFound);
      }
    } catch {
      setError(t.foodSearch.contactError);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setError(null);
    try {
      const products = await searchProducts(query);
      setResults(products);
      if (products.length === 0) setError(t.foodSearch.noResults);
    } catch {
      setError(t.foodSearch.contactError);
    } finally {
      setSearching(false);
    }
  };

  const gramsNum = parseFloat(gramsInput.replace(',', '.')) || 0;
  const previewProtein = selected ? (selected.proteinPer100g * gramsNum) / 100 : 0;
  const previewCarbs = selected ? (selected.carbsPer100g * gramsNum) / 100 : 0;
  const previewFat = selected ? (selected.fatPer100g * gramsNum) / 100 : 0;

  const handleAdd = async () => {
    if (!selected || gramsNum <= 0) return;
    await addNutritionEntry({
      date: todayKey(),
      proteinG: Math.round(previewProtein * 10) / 10,
      carbsG: Math.round(previewCarbs * 10) / 10,
      fatG: Math.round(previewFat * 10) / 10,
      foodName: selected.name,
      grams: gramsNum,
      unit: selected.unit,
      barcode: selected.barcode || null,
    });
    router.back();
  };

  const resetSelection = () => {
    setSelected(null);
    setScanning(true);
    setError(null);
  };

  if (selected) {
    return (
      <ThemedView variant="grouped" style={{ flex: 1 }}>
        <SafeAreaView edges={['bottom']} style={{ flex: 1, padding: Spacing.lg, gap: Spacing.lg }}>
          <Card style={{ gap: Spacing.md }}>
            <ThemedText variant="title3" weight="700">
              {selected.name}
            </ThemedText>
            <ThemedText variant="caption" color="tertiary">
              {t.foodSearch.per100(selected.unit)} : P {selected.proteinPer100g}g · G {selected.carbsPer100g}g · L{' '}
              {selected.fatPer100g}g
            </ThemedText>
            <View>
              <ThemedText variant="caption" color="tertiary">
                {selected.unit === 'ml' ? t.foodSearch.millilitersConsumed : t.foodSearch.gramsConsumed}
              </ThemedText>
              <Input
                keyboardType="decimal-pad"
                value={gramsInput}
                onChangeText={setGramsInput}
                placeholder="100"
              />
            </View>
            <ThemedText variant="subhead" color="secondary">
              → P {previewProtein.toFixed(1)}g · G {previewCarbs.toFixed(1)}g · L {previewFat.toFixed(1)}g
            </ThemedText>
            <Button title={t.foodSearch.addToLog} onPress={handleAdd} disabled={gramsNum <= 0} />
            <Button title={t.foodSearch.chooseAnotherFood} variant="plain" onPress={resetSelection} />
          </Card>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView variant="grouped" style={{ flex: 1 }}>
      <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
        <View style={{ padding: Spacing.lg, gap: Spacing.md }}>
          <SegmentedControl
            options={[
              { label: t.foodSearch.scan, value: 'scan' as const },
              { label: t.foodSearch.search, value: 'search' as const },
              { label: t.foodSearch.recent, value: 'recent' as const },
            ]}
            value={mode}
            onChange={(m) => {
              setMode(m);
              setError(null);
            }}
          />
        </View>

        {mode === 'scan' ? (
          <View style={{ flex: 1, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg }}>
            {!permission ? (
              <ActivityIndicator />
            ) : !permission.granted ? (
              <Card style={{ gap: Spacing.md, alignItems: 'center' }}>
                <ThemedText color="secondary" style={{ textAlign: 'center' }}>
                  {t.foodSearch.cameraPermissionPrompt}
                </ThemedText>
                <Button title={t.foodSearch.allowCamera} onPress={requestPermission} />
              </Card>
            ) : (
              <View style={{ flex: 1, borderRadius: Radius.lg, overflow: 'hidden' }}>
                <CameraView
                  style={{ flex: 1 }}
                  barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
                  onBarcodeScanned={scanning ? handleBarcodeScanned : undefined}
                />
                {loading && (
                  <View
                    style={[
                      StyleSheet.absoluteFill,
                      { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.overlay },
                    ]}
                  >
                    <ActivityIndicator color="#FFFFFF" />
                  </View>
                )}
              </View>
            )}
            {error && (
              <Card style={{ marginTop: Spacing.md, gap: Spacing.sm, alignItems: 'center' }}>
                <ThemedText color="secondary" style={{ textAlign: 'center' }}>
                  {error}
                </ThemedText>
                <Pressable onPress={resetSelection}>
                  <ThemedText variant="subhead" weight="600" color="accent">
                    {t.foodSearch.retry}
                  </ThemedText>
                </Pressable>
              </Card>
            )}
          </View>
        ) : mode === 'search' ? (
          <View style={{ flex: 1, paddingHorizontal: Spacing.lg, gap: Spacing.md }}>
            <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
              <Input
                style={{ flex: 1 }}
                placeholder={t.foodSearch.searchPlaceholder}
                value={query}
                onChangeText={setQuery}
                returnKeyType="search"
                onSubmitEditing={handleSearch}
              />
              <Pressable
                onPress={handleSearch}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: Radius.sm,
                  backgroundColor: colors.accent,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="search" size={20} color="#FFFFFF" />
              </Pressable>
            </View>
            {searching && <ActivityIndicator />}
            {error && (
              <ThemedText color="secondary" style={{ textAlign: 'center' }}>
                {error}
              </ThemedText>
            )}
            <ScrollView contentContainerStyle={{ gap: Spacing.sm, paddingBottom: Spacing.xxl }}>
              {results.map((p) => (
                <Pressable key={p.barcode + p.name} onPress={() => setSelected(p)}>
                  <Card style={{ gap: 2 }}>
                    <ThemedText variant="subhead" weight="600">
                      {p.name}
                    </ThemedText>
                    <ThemedText variant="caption" color="tertiary">
                      {t.foodSearch.per100(p.unit)} : P {p.proteinPer100g}g · G {p.carbsPer100g}g · L {p.fatPer100g}g
                    </ThemedText>
                  </Card>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : (
          <View style={{ flex: 1, paddingHorizontal: Spacing.lg }}>
            {recentFoods.length === 0 ? (
              <ThemedText color="secondary" style={{ textAlign: 'center', marginTop: Spacing.lg }}>
                {t.foodSearch.noRecentFoods}
              </ThemedText>
            ) : (
              <ScrollView contentContainerStyle={{ gap: Spacing.sm, paddingBottom: Spacing.xxl }}>
                {recentFoods.map((p) => (
                  <Pressable key={p.barcode + p.name} onPress={() => setSelected(p)}>
                    <Card style={{ gap: 2 }}>
                      <ThemedText variant="subhead" weight="600">
                        {p.name}
                      </ThemedText>
                      <ThemedText variant="caption" color="tertiary">
                        {t.foodSearch.per100(p.unit)} : P {p.proteinPer100g}g · G {p.carbsPer100g}g · L {p.fatPer100g}g
                      </ThemedText>
                    </Card>
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </View>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}
