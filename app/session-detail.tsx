import { useMemo, useRef, useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { ThemedText } from '../components/ThemedText';
import { ThemedView } from '../components/ThemedView';
import { Card } from '../components/Card';
import { Section } from '../components/Section';
import { SetLine } from '../components/SetLine';
import { Button } from '../components/Button';
import { ShareCard } from '../components/ShareCard';
import { ExerciseCard } from '../components/ExerciseCard';
import { TodaySessionsReview } from '../components/TodaySessionsReview';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { LOCALE_MAP, useTranslation } from '../hooks/useTranslation';
import { Spacing } from '../constants/theme';
import { shareCardAsImage } from '../lib/shareCard';
import { formatWeight } from '../utils/units';
import { formatLongDate, todayKey } from '../utils/date';
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
  const { t, lang } = useTranslation();
  const weightUnit = user?.weightUnit ?? 'kg';
  const cardRef = useRef<View>(null);
  const [sharing, setSharing] = useState(false);

  const daySessions = useMemo(() => sessions.filter((s) => s.date === date), [date, sessions]);

  const daySets = useMemo(() => {
    const sessionIds = new Set(daySessions.map((s) => s.id));
    return sets.filter((s) => sessionIds.has(s.sessionId));
  }, [daySessions, sets]);

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
        <ThemedText variant="title1" style={{ width: '100%' }}>
          {date ? formatLongDate(date, LOCALE_MAP[lang]) : ''}
        </ThemedText>

        {date === todayKey() && grouped.length > 0 ? (
          <View style={{ width: '100%' }}>
            <TodaySessionsReview />
          </View>
        ) : grouped.length === 0 ? (
          <Card style={{ width: '100%' }}>
            <ThemedText color="secondary" style={{ textAlign: 'center' }}>
              {t.sessionDetail.noExercisesThatDay}
            </ThemedText>
          </Card>
        ) : (
          <View style={{ width: '100%', gap: Spacing.md }}>
            {grouped.map(([exerciseId, exerciseSets]) => (
              <ExerciseCard key={exerciseId} title={exerciseSets[0].exerciseName}>
                {exerciseSets.map((s, i) => (
                  <View key={s.id} style={{ flexDirection: 'row', paddingVertical: 4 }}>
                    <SetLine index={i + 1}>
                      {s.reps} {t.common.reps.toLowerCase()} × {formatWeight(s.weightKg, weightUnit)}
                      {s.rpe ? ` · RPE ${s.rpe}` : ''}
                    </SetLine>
                  </View>
                ))}
              </ExerciseCard>
            ))}
          </View>
        )}

        {grouped.length > 0 && (
          <>
            <View style={{ alignSelf: 'stretch', marginTop: Spacing.md }}>
              <Section title={t.sessionDetail.yourSheet}>
                <View />
              </Section>
            </View>
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
