import { useEffect, useState } from 'react';
import { Alert, Image, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useNavigation, router } from 'expo-router';
import { ThemedText } from '../components/ThemedText';
import { ThemedView } from '../components/ThemedView';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import { useData } from '../context/DataContext';
import { Spacing } from '../constants/theme';
import { MUSCLE_GROUP_CATEGORY } from '../types';
import { API_URL, getTokens } from '../lib/api';
import { CatalogDetail, catalogTargetToMuscleGroup, getCatalogDetail } from '../lib/exerciseCatalog';
import { equipmentLabel, targetLabel } from '../constants/exerciseCatalogLabels';

function capitalize(s: string) {
  return s.length ? s[0].toUpperCase() + s.slice(1) : s;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View>
      <ThemedText variant="caption" color="tertiary" style={{ marginBottom: 6 }}>
        {title}
      </ThemedText>
      {children}
    </View>
  );
}

export default function ExerciseCatalogDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { t, lang } = useTranslation();
  const { addExercise } = useData();
  const [detail, setDetail] = useState<CatalogDetail | null>(null);
  const [authHeader, setAuthHeader] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!id) return;
    getCatalogDetail(Number(id), lang).then((d) => {
      setDetail(d);
      navigation.setOptions({ title: d.name[0].toUpperCase() + d.name.slice(1) });
    });
    getTokens().then(({ accessToken }) => setAuthHeader(accessToken));
  }, [id, lang, navigation]);

  const handleAdd = async () => {
    if (!detail) return;
    setAdding(true);
    try {
      const muscleGroup = catalogTargetToMuscleGroup(detail.target);
      await addExercise({
        name: detail.name[0].toUpperCase() + detail.name.slice(1),
        category: MUSCLE_GROUP_CATEGORY[muscleGroup],
        muscleGroup,
        isCustom: true,
      });
      Alert.alert(t.exerciseCatalog.addedToMyExercises);
      router.back();
    } finally {
      setAdding(false);
    }
  };

  if (!detail) return <ThemedView variant="grouped" style={{ flex: 1 }} />;

  return (
    <ThemedView variant="grouped" style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.lg, paddingBottom: Spacing.xxl }}>
        <View
          style={{
            width: '100%',
            aspectRatio: 1,
            backgroundColor: colors.fill,
            borderRadius: 16,
            overflow: 'hidden',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {authHeader && (
            <Image
              source={{ uri: `${API_URL}${detail.gifUrl}`, headers: { Authorization: `Bearer ${authHeader}` } }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="contain"
            />
          )}
        </View>

        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
          <Card style={{ flex: 1, gap: 2 }}>
            <ThemedText variant="caption" color="tertiary">
              {t.exerciseCatalog.target}
            </ThemedText>
            <ThemedText variant="subhead" weight="600">
              {capitalize(targetLabel(detail.target, lang))}
            </ThemedText>
          </Card>
          <Card style={{ flex: 1, gap: 2 }}>
            <ThemedText variant="caption" color="tertiary">
              {t.exerciseCatalog.equipment}
            </ThemedText>
            <ThemedText variant="subhead" weight="600">
              {capitalize(equipmentLabel(detail.equipment, lang))}
            </ThemedText>
          </Card>
        </View>

        {detail.secondaryMuscles.length > 0 && (
          <Section title={t.exerciseCatalog.secondaryMuscles}>
            <ThemedText variant="subhead">
              {capitalize(detail.secondaryMuscles.map((m) => targetLabel(m, lang)).join(', '))}
            </ThemedText>
          </Section>
        )}

        <Section title={t.exerciseCatalog.instructions}>
          <View style={{ gap: 6 }}>
            {detail.instructions.map((step, i) => (
              <ThemedText key={i} variant="subhead" color="secondary">
                {i + 1}. {step}
              </ThemedText>
            ))}
          </View>
        </Section>

        <Button title={t.exerciseCatalog.addToMyExercises} onPress={handleAdd} disabled={adding} />
      </ScrollView>
    </ThemedView>
  );
}
