import { useMemo, useRef, useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ThemedText } from '../components/ThemedText';
import { ThemedView } from '../components/ThemedView';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { IconButton } from '../components/IconButton';
import { ShareCard } from '../components/ShareCard';
import { ExerciseCard } from '../components/ExerciseCard';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { LOCALE_MAP, useTranslation } from '../hooks/useTranslation';
import { Spacing } from '../constants/theme';
import { shareCardAsImage } from '../lib/shareCard';
import { formatWeight } from '../utils/units';
import { formatLongDate } from '../utils/date';
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
  const { sessions, sets, removeSession } = useData();
  const { user } = useAuth();
  const { t, lang } = useTranslation();
  const weightUnit = user?.weightUnit ?? 'kg';
  const cardRef = useRef<View>(null);
  const [sharing, setSharing] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  const handleDelete = () => {
    if (daySessions.length === 0) return;
    Alert.alert(t.seance.deleteSessionConfirmTitle, t.seance.deleteSessionConfirmBody, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.common.delete,
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            for (const s of daySessions) await removeSession(s.id);
            router.back();
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  };

  return (
    <ThemedView variant="grouped" style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.lg, alignItems: 'center' }}>
        <View style={{ width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <ThemedText variant="title1">{date ? formatLongDate(date, LOCALE_MAP[lang]) : ''}</ThemedText>
          {daySessions.length > 0 && (
            <IconButton name="trash-outline" variant="destructive" onPress={handleDelete} disabled={deleting} />
          )}
        </View>

        {grouped.length === 0 ? (
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
                  <ThemedText key={s.id} variant="subhead" color="secondary">
                    {t.seance.setLabel(i + 1)} · {s.reps} {t.common.reps.toLowerCase()} × {formatWeight(s.weightKg, weightUnit)}
                    {s.rpe ? ` · RPE ${s.rpe}` : ''}
                  </ThemedText>
                ))}
              </ExerciseCard>
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
