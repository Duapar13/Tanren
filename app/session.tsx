import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeOutLeft, LinearTransition } from 'react-native-reanimated';
import { ThemedText } from '../components/ThemedText';
import { ThemedView } from '../components/ThemedView';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { IconButton } from '../components/IconButton';
import { Popup } from '../components/Popup';
import { EmptyState } from '../components/EmptyState';
import { RestTimerBanner } from '../components/RestTimerBanner';
import { Stepper } from '../components/session/Stepper';
import { SwipeableSetRow } from '../components/session/SwipeableSetRow';
import { ExercisePickerSheet } from '../components/session/ExercisePickerSheet';
import { PRCelebration } from '../components/session/PRCelebration';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../hooks/useTheme';
import { useRanking } from '../hooks/useRanking';
import { useTranslation } from '../hooks/useTranslation';
import { Radius, Spacing } from '../constants/theme';
import { findExerciseGuide } from '../constants/exerciseGuides';
import { todayKey } from '../utils/date';
import { suggestSession } from '../utils/sessionSuggestion';
import { computeExercisePRs } from '../utils/prStats';
import { clearSessionDraft, DraftSet, loadActiveDraft, saveSessionDraft } from '../utils/sessionDraft';
import { setSessionScreenOpen } from '../lib/sessionRuntime';
import { displayToKg, formatWeight, kgToDisplay } from '../utils/units';
import { haptics } from '../lib/haptics';
import { showToast } from '../lib/toast';
import { NinjaMascot } from '../components/NinjaMascot';

const parseNum = (v: string): number => {
  const n = parseFloat(v.replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
};

const toDisplayString = (kg: number, unit: 'kg' | 'lbs'): string =>
  String(Math.round(kgToDisplay(kg, unit) * 10) / 10);

function formatElapsed(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export default function SessionScreen() {
  const {
    exercises,
    sessions,
    sets,
    addSession,
    addSetsToSession,
    addExercise,
    workoutTemplates,
    addWorkoutTemplate,
  } = useData();
  const { user } = useAuth();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { ranking } = useRanking();
  const launch = useLocalSearchParams<{ exerciseIds?: string; templateId?: string }>();
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Constants.statusBarHeight ?? 0);

  const weightUnit = user?.weightUnit ?? 'kg';
  const rpeEnabled = user?.rpeEnabled ?? false;
  // The workout belongs to the day it was started, even if it is finished after midnight.
  const [sessionDate, setSessionDate] = useState(() => todayKey());
  const resumeTarget = useMemo(() => sessions.find((s) => s.date === sessionDate) ?? null, [sessions, sessionDate]);

  const [hydrated, setHydrated] = useState(false);
  const [activeIds, setActiveIds] = useState<number[]>([]);
  const [draftSets, setDraftSets] = useState<Record<number, DraftSet[]>>({});
  // The chrono only starts with the first logged set, not when the screen opens.
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [repsStr, setRepsStr] = useState('');
  const [weightStr, setWeightStr] = useState('');
  const [rpeStr, setRpeStr] = useState('');
  const [showGuide, setShowGuide] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [restTimerEndAt, setRestTimerEndAt] = useState<number | null>(null);
  const [records, setRecords] = useState<{ exerciseId: number; name: string; weightKg: number }[]>([]);
  const [celebration, setCelebration] = useState<{ name: string; weight: string } | null>(null);
  const [templatePopup, setTemplatePopup] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const finishedRef = useRef(false);

  useEffect(() => {
    setSessionScreenOpen(true);
    return () => setSessionScreenOpen(false);
  }, []);

  // Chrono
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Restore an unfinished workout, otherwise pre-load whatever the entry point asked for.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const draft = await loadActiveDraft();
      if (cancelled) return;
      if (draft && draft.activeExerciseIds.length > 0) {
        setSessionDate(draft.date);
        setActiveIds(draft.activeExerciseIds);
        setDraftSets(draft.draftSets);
        setStartedAt(draft.startedAt ?? null);
      } else {
        let ids: number[] = [];
        if (launch.templateId) {
          ids = workoutTemplates.find((tpl) => tpl.id === Number(launch.templateId))?.exerciseIds ?? [];
        } else if (launch.exerciseIds) {
          ids = launch.exerciseIds.split(',').map(Number);
        }
        ids = Array.from(new Set(ids)).filter((id) => exercises.some((e) => e.id === id && !e.deletedAt));
        setActiveIds(ids);
        setStartedAt(null);
      }
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
    // Runs once on open: later data changes must not reset a workout in progress.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Every change is written to disk so a killed app never loses logged sets.
  useEffect(() => {
    if (!hydrated || finishedRef.current) return;
    if (activeIds.length === 0) {
      clearSessionDraft();
      return;
    }
    saveSessionDraft(sessionDate, {
      activeExerciseIds: activeIds,
      draftSets,
      validatedExerciseIds: [],
      resuming: !!resumeTarget,
      startedAt: startedAt ?? undefined,
    });
  }, [hydrated, activeIds, draftSets, startedAt, sessionDate, resumeTarget]);

  useEffect(() => {
    if (activeIds.length === 0) setSelectedId(null);
    else if (selectedId == null || !activeIds.includes(selectedId)) setSelectedId(activeIds[0]);
  }, [activeIds, selectedId]);

  const exercisePRs = useMemo(() => computeExercisePRs(sets, sessions), [sets, sessions]);
  const suggestion = useMemo(() => suggestSession(sessions, sets, exercises), [sessions, sets, exercises]);
  const selected = selectedId != null ? exercises.find((e) => e.id === selectedId) ?? null : null;
  const selectedSets = selectedId != null ? draftSets[selectedId] ?? [] : [];

  // Top set of the most recent earlier session that included the selected exercise.
  const lastPerformance = useMemo(() => {
    if (selectedId == null) return null;
    const dateBySession = new Map(sessions.map((s) => [s.id, { date: s.date, id: s.id }]));
    let best: { date: string; sessionId: number } | null = null;
    for (const s of sets) {
      if (s.exerciseId !== selectedId) continue;
      const meta = dateBySession.get(s.sessionId);
      if (!meta) continue;
      if (!best || meta.date > best.date || (meta.date === best.date && meta.id > best.sessionId)) {
        best = { date: meta.date, sessionId: meta.id };
      }
    }
    if (!best) return null;
    const inSession = sets.filter((s) => s.exerciseId === selectedId && s.sessionId === best!.sessionId);
    return inSession.reduce((top, s) =>
      s.weightKg > top.weightKg || (s.weightKg === top.weightKg && s.reps > top.reps) ? s : top
    );
  }, [selectedId, sets, sessions]);

  // Keep the inputs pre-filled: the set being edited, else the last set logged in this workout,
  // else last time's top set — so a new set is usually just a tap on "log".
  const selectedSetCount = selectedSets.length;
  useEffect(() => {
    if (selectedId == null) return;
    const source: { reps: number; weightKg: number; rpe?: number | null } | null =
      editingIndex !== null && selectedSets[editingIndex]
        ? selectedSets[editingIndex]
        : selectedSets.length > 0
          ? selectedSets[selectedSets.length - 1]
          : lastPerformance;
    setRepsStr(source ? String(source.reps) : '');
    setWeightStr(source ? toDisplayString(source.weightKg, weightUnit) : '');
    setRpeStr(editingIndex !== null && source?.rpe != null ? String(source.rpe) : '');
    // selectedSets is read through selectedSetCount/editingIndex on purpose (see comment above).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, selectedSetCount, editingIndex, lastPerformance, weightUnit]);

  const totalSets = Object.values(draftSets).reduce((sum, list) => sum + list.length, 0);
  const totalVolumeKg = Object.values(draftSets).reduce(
    (sum, list) => sum + list.reduce((acc, s) => acc + s.weightKg * s.reps, 0),
    0
  );
  const elapsedSeconds = startedAt ? Math.max(0, Math.floor((now - startedAt) / 1000)) : 0;

  const pickableExercises = useMemo(() => {
    const lastUsed = new Map<number, string>();
    const dateBySession = new Map(sessions.map((s) => [s.id, s.date]));
    for (const s of sets) {
      const date = dateBySession.get(s.sessionId);
      if (date && (lastUsed.get(s.exerciseId) ?? '') < date) lastUsed.set(s.exerciseId, date);
    }
    return exercises
      .filter((e) => !e.deletedAt && !activeIds.includes(e.id))
      .sort((a, b) => (lastUsed.get(b.id) ?? '').localeCompare(lastUsed.get(a.id) ?? '') || a.name.localeCompare(b.name));
  }, [exercises, sets, sessions, activeIds]);

  const addExerciseToSession = (id: number) => {
    setActiveIds((ids) => (ids.includes(id) ? ids : [...ids, id]));
    setSelectedId(id);
    setEditingIndex(null);
  };

  const handleCreateExercise = async (name: string, category: 'upper' | 'lower') => {
    const id = await addExercise({
      name,
      category,
      muscleGroup: category === 'upper' ? 'pecs' : 'quadriceps',
      isCustom: true,
    });
    addExerciseToSession(id);
  };

  const selectExercise = (id: number) => {
    haptics.tap();
    setSelectedId(id);
    setEditingIndex(null);
    setShowGuide(false);
  };

  const handleValidate = () => {
    if (selectedId == null || !selected) return;
    const reps = Math.round(parseNum(repsStr));
    const weight = parseNum(weightStr);
    if (!(reps > 0) || !Number.isFinite(weight) || weight < 0) return;
    const set: DraftSet = {
      reps,
      weightKg: displayToKg(weight, weightUnit),
      rpe: rpeEnabled && rpeStr.trim() ? parseNum(rpeStr) : null,
    };
    Keyboard.dismiss();

    if (editingIndex !== null) {
      setDraftSets((prev) => ({
        ...prev,
        [selectedId]: (prev[selectedId] ?? []).map((s, i) => (i === editingIndex ? set : s)),
      }));
      setEditingIndex(null);
      haptics.tap();
      return;
    }

    // A record = heavier than anything previously logged for this exercise, in history or earlier
    // in this very workout. A first-ever exercise has nothing to beat, so it never counts.
    const previousBest = exercisePRs.get(selectedId)?.maxWeightKg ?? 0;
    const bestSoFar = Math.max(previousBest, ...selectedSets.map((s) => s.weightKg));
    const isRecord = previousBest > 0 && set.weightKg > bestSoFar;

    setDraftSets((prev) => ({ ...prev, [selectedId]: [...(prev[selectedId] ?? []), set] }));
    setStartedAt((prev) => prev ?? Date.now());

    if (isRecord) {
      haptics.record();
      setRecords((prev) => [
        ...prev.filter((r) => r.exerciseId !== selectedId),
        { exerciseId: selectedId, name: selected.name, weightKg: set.weightKg },
      ]);
      setCelebration({ name: selected.name, weight: formatWeight(set.weightKg, weightUnit) });
    } else {
      haptics.success();
    }

    if (user?.restTimerEnabled) {
      setRestTimerEndAt(
        user.restTimerMode === 'stopwatch' ? Date.now() : Date.now() + user.restTimerSeconds * 1000
      );
    }
  };

  const deleteSet = (index: number) => {
    if (selectedId == null) return;
    setDraftSets((prev) => ({ ...prev, [selectedId]: (prev[selectedId] ?? []).filter((_, i) => i !== index) }));
    setEditingIndex(null);
  };

  const confirmRemoveExercise = () => {
    if (selectedId == null) return;
    const id = selectedId;
    Alert.alert(
      t.seance.removeExerciseConfirmTitle,
      selectedSets.length > 0 ? t.seance.removeExerciseConfirmBody(selectedSets.length) : undefined,
      [
        { text: t.common.cancel, style: 'cancel' },
        {
          text: t.common.delete,
          style: 'destructive',
          onPress: () => {
            setActiveIds((ids) => ids.filter((x) => x !== id));
            setDraftSets((prev) => {
              const next = { ...prev };
              delete next[id];
              return next;
            });
            setRecords((prev) => prev.filter((r) => r.exerciseId !== id));
            setEditingIndex(null);
          },
        },
      ]
    );
  };

  const handleExit = () => {
    Keyboard.dismiss();
    if (activeIds.length === 0) {
      router.back();
      return;
    }
    Alert.alert(t.session.exitTitle, t.session.exitBody, [
      { text: t.session.exitKeep, style: 'cancel' },
      { text: t.session.exitLeave, onPress: () => router.back() },
    ]);
  };

  const commitSession = async () => {
    setSubmitting(true);
    try {
      const setInputs = activeIds.flatMap((exerciseId) =>
        (draftSets[exerciseId] ?? []).map((s, i) => ({
          exerciseId,
          setNumber: i + 1,
          reps: s.reps,
          weightKg: s.weightKg,
          rpe: s.rpe,
        }))
      );
      finishedRef.current = true;
      if (resumeTarget) await addSetsToSession(resumeTarget.id, setInputs);
      else await addSession({ date: sessionDate, category: 'custom', notes: '' }, setInputs);
      await clearSessionDraft();
      haptics.finish();
      router.replace({
        pathname: '/session-recap',
        params: {
          startedAt: String(startedAt ?? Date.now()),
          sets: String(totalSets),
          volumeKg: String(totalVolumeKg),
          exercises: String(activeIds.filter((id) => (draftSets[id] ?? []).length > 0).length),
          records: JSON.stringify(records),
          startPoints: String(ranking.totalPoints),
        },
      } as unknown as Href);
    } catch (err) {
      finishedRef.current = false;
      console.warn('[session] finish failed', err);
      setSubmitting(false);
    }
  };

  const handleFinish = () => {
    Keyboard.dismiss();
    if (totalSets === 0) {
      Alert.alert(t.session.needOneSet);
      return;
    }
    Alert.alert(t.session.finishConfirmTitle, t.session.finishConfirmBody(totalSets), [
      { text: t.common.cancel, style: 'cancel' },
      { text: t.session.finish, onPress: commitSession },
    ]);
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim() || activeIds.length === 0) return;
    await addWorkoutTemplate({ name: templateName.trim(), exerciseIds: activeIds });
    setTemplateName('');
    setTemplatePopup(false);
    showToast(t.workoutTemplates.savedConfirmation, 'happy');
  };

  const guide = selected ? findExerciseGuide(selected.name) : null;
  const personalBest = selectedId != null ? exercisePRs.get(selectedId)?.maxWeightKg ?? 0 : 0;
  const currentIndex = selectedId != null ? activeIds.indexOf(selectedId) : -1;
  const nextId = currentIndex >= 0 && currentIndex < activeIds.length - 1 ? activeIds[currentIndex + 1] : null;
  const weightStep = weightUnit === 'kg' ? 2.5 : 5;
  const editing = editingIndex !== null;

  return (
    <ThemedView variant="grouped" style={{ flex: 1 }}>
      <SafeAreaView edges={['bottom']} style={{ flex: 1, paddingTop: topInset }}>
        <PRCelebration record={celebration} onDone={() => setCelebration(null)} />

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm }}>
          <IconButton name="chevron-down" onPress={handleExit} />
          <View style={{ flex: 1, alignItems: 'center' }}>
            <ThemedText variant="title3" weight="800" style={{ fontVariant: ['tabular-nums'] }}>
              {formatElapsed(elapsedSeconds)}
            </ThemedText>
            <ThemedText variant="footnote" color="secondary">
              {totalSets} {t.session.sets} · {formatWeight(totalVolumeKg, weightUnit, 0)}
            </ThemedText>
          </View>
          <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
            {activeIds.length > 0 && <IconButton name="bookmark-outline" onPress={() => setTemplatePopup(true)} />}
            <Pressable
              onPress={handleFinish}
              disabled={submitting}
              style={({ pressed }) => ({
                minHeight: 44,
                paddingHorizontal: Spacing.lg,
                borderRadius: Radius.md,
                backgroundColor: colors.accent,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: totalSets === 0 ? 0.4 : pressed ? 0.8 : 1,
              })}
            >
              <ThemedText variant="subhead" weight="800" style={{ color: colors.onAccent }}>
                {t.session.finish}
              </ThemedText>
            </Pressable>
          </View>
        </View>

        {activeIds.length > 0 && (
          <View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm }}
            >
              {activeIds.map((id, i) => {
                const ex = exercises.find((e) => e.id === id);
                if (!ex) return null;
                const isSelected = id === selectedId;
                const done = (draftSets[id] ?? []).length > 0;
                return (
                  <Pressable
                    key={id}
                    onPress={() => selectExercise(id)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      maxWidth: 190,
                      paddingHorizontal: 14,
                      paddingVertical: 9,
                      borderRadius: Radius.pill,
                      backgroundColor: isSelected ? colors.accent : colors.card,
                      borderWidth: 1,
                      borderColor: isSelected ? colors.accent : colors.border,
                    }}
                  >
                    {done ? (
                      <Ionicons name="checkmark-circle" size={16} color={isSelected ? colors.onAccent : colors.positive} />
                    ) : (
                      <ThemedText variant="footnote" weight="800" style={{ color: isSelected ? colors.onAccent : colors.textTertiary }}>
                        {i + 1}
                      </ThemedText>
                    )}
                    <ThemedText
                      variant="subhead"
                      weight="700"
                      numberOfLines={1}
                      style={{ color: isSelected ? colors.onAccent : colors.text, flexShrink: 1 }}
                    >
                      {ex.name}
                    </ThemedText>
                  </Pressable>
                );
              })}
              <Pressable
                onPress={() => setPickerOpen(true)}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: colors.accentSoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="add" size={22} color={colors.accent} />
              </Pressable>
            </ScrollView>
          </View>
        )}

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            onScrollBeginDrag={Keyboard.dismiss}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.md }}
          >
            {!selected ? (
              <View style={{ gap: Spacing.lg }}>
                <EmptyState icon="barbell-outline" text={t.session.emptyHint} />
                <ThemedText variant="title3" style={{ textAlign: 'center' }}>
                  {t.session.emptyTitle}
                </ThemedText>
                {suggestion.exerciseIds.length > 0 && (
                  <Pressable
                    onPress={() => setActiveIds(suggestion.exerciseIds)}
                    style={({ pressed }) => ({
                      gap: 4,
                      padding: Spacing.lg,
                      borderRadius: Radius.lg,
                      backgroundColor: colors.accentSoft,
                      borderWidth: 1,
                      borderColor: colors.accent + '4D',
                      opacity: pressed ? 0.75 : 1,
                    })}
                  >
                    <ThemedText variant="footnote" weight="800" color="accent" style={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>
                      {t.dashboard.suggested}
                    </ThemedText>
                    <ThemedText variant="title3">
                      {suggestion.category === 'upper' ? t.dashboard.upper : t.dashboard.lower}
                    </ThemedText>
                    <ThemedText variant="footnote" color="secondary">
                      {t.seance.exerciseCount(suggestion.exerciseIds.length)}
                    </ThemedText>
                  </Pressable>
                )}
                <Button title={t.session.addExercise} variant={suggestion.exerciseIds.length > 0 ? 'tonal' : 'filled'} onPress={() => setPickerOpen(true)} />
                {workoutTemplates.length > 0 && (
                  <View style={{ gap: Spacing.sm }}>
                    <ThemedText variant="footnote" weight="700" color="secondary" style={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>
                      {t.workoutTemplates.startFromTemplate}
                    </ThemedText>
                    {workoutTemplates.map((tpl) => (
                      <Pressable
                        key={tpl.id}
                        onPress={() => {
                          const ids = tpl.exerciseIds.filter((id) => exercises.some((e) => e.id === id && !e.deletedAt));
                          setActiveIds(ids);
                        }}
                        style={({ pressed }) => ({
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: Spacing.md,
                          padding: Spacing.md,
                          borderRadius: Radius.lg,
                          backgroundColor: colors.card,
                          borderWidth: 1,
                          borderColor: colors.border,
                          opacity: pressed ? 0.75 : 1,
                        })}
                      >
                        <View style={{ flex: 1 }}>
                          <ThemedText variant="subhead" weight="800">
                            {tpl.name}
                          </ThemedText>
                          <ThemedText variant="footnote" color="tertiary">
                            {t.seance.exerciseCount(tpl.exerciseIds.length)}
                          </ThemedText>
                        </View>
                        <Ionicons name="play" size={16} color={colors.accent} />
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            ) : (
              <>
                <View style={{ gap: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
                    <ThemedText variant="title2" numberOfLines={2} style={{ flex: 1 }}>
                      {selected.name}
                    </ThemedText>
                    <NinjaMascot
                      size={52}
                      reaction={celebration ? 'excited' : restTimerEndAt ? 'sleepy' : 'focused'}
                      animated
                      interactive
                      hopKey={totalSets}
                    />
                  </View>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.sm }}>
                    {personalBest > 0 && (
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                          borderRadius: Radius.pill,
                          backgroundColor: colors.accentSoft,
                        }}
                      >
                        <Ionicons name="trophy" size={12} color={colors.accent} />
                        <ThemedText variant="footnote" weight="800" color="accent">
                          {formatWeight(personalBest, weightUnit)}
                        </ThemedText>
                      </View>
                    )}
                    <ThemedText variant="footnote" color="tertiary">
                      {lastPerformance
                        ? t.session.lastTime(`${lastPerformance.reps} × ${formatWeight(lastPerformance.weightKg, weightUnit)}`)
                        : t.session.firstTime}
                    </ThemedText>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 }}>
                    {guide ? (
                      <Pressable onPress={() => setShowGuide((v) => !v)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="information-circle-outline" size={16} color={colors.accent} />
                        <ThemedText variant="footnote" weight="700" color="accent">
                          {t.session.howTo}
                        </ThemedText>
                        <Ionicons name={showGuide ? 'chevron-up' : 'chevron-down'} size={14} color={colors.textTertiary} />
                      </Pressable>
                    ) : (
                      <View />
                    )}
                    <Pressable onPress={confirmRemoveExercise} hitSlop={8}>
                      <ThemedText variant="footnote" weight="700" style={{ color: colors.negative }}>
                        {t.session.removeExercise}
                      </ThemedText>
                    </Pressable>
                  </View>
                  {guide && showGuide && (
                    <Card style={{ gap: 4, padding: Spacing.md }}>
                      {guide.cues.map((cue, i) => (
                        <ThemedText key={i} variant="footnote" color="secondary">
                          • {cue}
                        </ThemedText>
                      ))}
                    </Card>
                  )}
                </View>

                {selectedSets.length > 0 && (
                  <Card style={{ padding: Spacing.sm, gap: 4 }}>
                    {selectedSets.map((s, i) => (
                      <Animated.View key={i} entering={FadeInDown.duration(260)} exiting={FadeOutLeft.duration(180)} layout={LinearTransition}>
                      <SwipeableSetRow onDelete={() => deleteSet(i)} onEdit={() => setEditingIndex(i)}>
                        <Pressable
                          onPress={() => setEditingIndex(editingIndex === i ? null : i)}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: Spacing.md,
                            minHeight: 44,
                            paddingHorizontal: Spacing.md,
                            backgroundColor: editingIndex === i ? colors.accentSoft : colors.card,
                          }}
                        >
                          <View
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: 14,
                              backgroundColor: colors.accentSoft,
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <ThemedText variant="footnote" weight="800" color="accent">
                              {i + 1}
                            </ThemedText>
                          </View>
                          <ThemedText variant="headline" weight="800" style={{ flex: 1 }}>
                            {s.reps} × {formatWeight(s.weightKg, weightUnit)}
                            {s.rpe ? ` · RPE ${s.rpe}` : ''}
                          </ThemedText>
                          {editingIndex === i && <Ionicons name="pencil" size={16} color={colors.accent} />}
                        </Pressable>
                      </SwipeableSetRow>
                      </Animated.View>
                    ))}
                  </Card>
                )}

              </>
            )}
          </ScrollView>

          {selected && (
            <View style={{ paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm }}>
              <Card variant="accent" style={{ gap: Spacing.md, padding: Spacing.md }}>
                <ThemedText variant="footnote" weight="800" color="accent" style={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>
                  {editing ? `${t.common.edit} · ${t.session.setNumber((editingIndex ?? 0) + 1)}` : t.session.setNumber(selectedSets.length + 1)}
                </ThemedText>
                <View style={{ flexDirection: 'row', gap: Spacing.md }}>
                  <Stepper label={t.common.reps} value={repsStr} onChange={setRepsStr} step={1} min={0} decimals={0} />
                  <Stepper
                    label={t.session.weightLabel(weightUnit)}
                    value={weightStr}
                    onChange={setWeightStr}
                    step={weightStep}
                    min={0}
                    decimals={1}
                  />
                </View>
                {rpeEnabled && (
                  <Stepper label={t.common.rpe} value={rpeStr} onChange={setRpeStr} step={0.5} min={1} decimals={1} placeholder="—" />
                )}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                  <Button
                    title={editing ? t.common.save : t.session.validateSet}
                    onPress={handleValidate}
                    style={{ flex: 1 }}
                  />
                  {editing ? (
                    <IconButton name="close" onPress={() => setEditingIndex(null)} />
                  ) : (
                    selectedSets.length > 0 && (
                      <IconButton
                        name={nextId != null ? 'arrow-forward' : 'add'}
                        variant="accent"
                        onPress={() => (nextId != null ? selectExercise(nextId) : setPickerOpen(true))}
                      />
                    )
                  )}
                </View>
              </Card>
            </View>
          )}
        </KeyboardAvoidingView>

        {restTimerEndAt && (
          <View style={{ paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm }}>
            <RestTimerBanner
              endAt={restTimerEndAt}
              mode={user?.restTimerMode ?? 'countdown'}
              onDone={() => setRestTimerEndAt(null)}
            />
          </View>
        )}
      </SafeAreaView>

      <ExercisePickerSheet
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        exercises={pickableExercises}
        onPick={addExerciseToSession}
        onCreate={handleCreateExercise}
      />

      <Popup title={t.workoutTemplates.saveAsTemplate} visible={templatePopup} onClose={() => setTemplatePopup(false)}>
        <View style={{ gap: Spacing.sm }}>
          <Input
            placeholder={t.workoutTemplates.namePlaceholder}
            value={templateName}
            onChangeText={setTemplateName}
            returnKeyType="done"
            onSubmitEditing={handleSaveTemplate}
          />
          <Button title={t.workoutTemplates.createButton} onPress={handleSaveTemplate} disabled={!templateName.trim()} />
        </View>
      </Popup>
    </ThemedView>
  );
}
