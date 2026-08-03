import { useMemo, useRef, useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { ThemedText } from '../components/ThemedText';
import { ThemedView } from '../components/ThemedView';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { ShareCard } from '../components/ShareCard';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../hooks/useTranslation';
import { Spacing } from '../constants/theme';
import { shareCardAsImage } from '../lib/shareCard';
import { formatWeight } from '../utils/units';
import { SetWithExercise } from '../types';

function groupByExercise(sets: SetWithExercise[]) {
  const map = new Map<number, SetWithExercise[]>();
  for (const s of sets) {
    if (!map.has(s.exerciseId)) map.set(s.exerciseId, []);
    map.get(s.exerciseId)!.push(s);
  }
  return [...map.entries()];
}

export default function SessionDetailScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const { sessions, sets } = useData();
  const { user } = useAuth();
  const { t } = useTranslation();
  const weightUnit = user?.weightUnit ?? 'kg';
  const cardRef = useRef<View>(null);
  const [sharing, setSharing] = useState(false);

  const daySets = useMemo(() => {
    if (!date) return [];
    const sessionIds = new Set(sessions.filter((s) => s.date === date).map((s) => s.id));
    return sets.filter((s) => sessionIds.has(s.sessionId));
  }, [date, sessions, sets]);

  const grouped = groupByExercise(daySets);

  const handleShare = async () => {
    setSharing(true);
    try {
      await shareCardAsImage(cardRef);
    } catch {
      Alert.alert(t.sessionDetail.shareErrorTitle, t.sessionDetail.shareErrorBody);
    } finally {
      setSharing(false);
    }
  };

  return (
    <ThemedView variant="grouped" style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.lg, alignItems: 'center' }}>
        <ThemedText variant="title1" style={{ alignSelf: 'flex-start' }}>
          {date}
        </ThemedText>

        {grouped.length === 0 ? (
          <Card style={{ width: '100%' }}>
            <ThemedText color="secondary" style={{ textAlign: 'center' }}>
              {t.sessionDetail.noExercisesThatDay}
            </ThemedText>
          </Card>
        ) : (
          <View style={{ width: '100%', gap: Spacing.md }}>
            {grouped.map(([exerciseId, exerciseSets]) => (
              <Card key={exerciseId} style={{ gap: 6 }}>
                <ThemedText variant="headline">{exerciseSets[0].exerciseName}</ThemedText>
                {exerciseSets.map((s, i) => (
                  <ThemedText key={s.id} variant="subhead" color="secondary">
                    {t.seance.setLabel(i + 1)} · {s.reps} {t.common.reps.toLowerCase()} × {formatWeight(s.weightKg, weightUnit)}
                    {s.rpe ? ` · RPE ${s.rpe}` : ''}
                  </ThemedText>
                ))}
              </Card>
            ))}
          </View>
        )}

        {grouped.length > 0 && (
          <>
            <ThemedText variant="headline" style={{ alignSelf: 'flex-start', marginTop: Spacing.md }}>
              {t.sessionDetail.yourSheet}
            </ThemedText>
            <ShareCard ref={cardRef} variant="session" date={date ?? ''} sets={daySets} weightUnit={weightUnit} />
            <Button
              title={sharing ? t.sessionDetail.generating : t.sessionDetail.share}
              onPress={handleShare}
              disabled={sharing}
              style={{ width: '100%' }}
            />
          </>
        )}
      </ScrollView>
    </ThemedView>
  );
}
