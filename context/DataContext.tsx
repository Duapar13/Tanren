import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { Alert } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import {
  BodyWeightEntry,
  BodyWeightEntryInput,
  Exercise,
  ExerciseInput,
  MeasurementEntry,
  MeasurementEntryInput,
  NutritionEntry,
  NutritionEntryInput,
  SetEntry,
  SetEntryInput,
  SetWithExercise,
  WorkoutSession,
  WorkoutSessionInput,
} from '../types';
import * as exercisesDb from '../db/exercises';
import * as sessionsDb from '../db/sessions';
import * as setsDb from '../db/sets';
import * as bodyWeightDb from '../db/bodyWeight';
import * as nutritionDb from '../db/nutrition';
import * as measurementsDb from '../db/measurements';
import { cancelPendingCreate, clearQueueForLocalIds, enqueue, getRowServerId } from '../db/syncQueue';
import { requestSync } from '../lib/syncBus';
import { LOCALE_MAP, useTranslation } from '../hooks/useTranslation';
import { formatLongDate, todayKey } from '../utils/date';
import { clearSessionDraft, peekStaleDraft } from '../utils/sessionDraft';

interface DataContextValue {
  loading: boolean;
  exercises: Exercise[];
  sessions: WorkoutSession[];
  sets: SetWithExercise[];
  bodyWeightEntries: BodyWeightEntry[];
  nutritionEntries: NutritionEntry[];
  measurementEntries: MeasurementEntry[];
  reload: () => Promise<void>;

  addExercise: (input: ExerciseInput) => Promise<number>;
  updateExercise: (id: number, input: Partial<Pick<Exercise, 'name' | 'category'>>) => Promise<void>;
  removeExercise: (id: number) => Promise<void>;

  addSession: (
    input: WorkoutSessionInput,
    setInputs: Omit<SetEntryInput, 'sessionId'>[]
  ) => Promise<number>;
  removeSession: (id: number) => Promise<void>;
  addSetsToSession: (
    sessionId: number,
    setInputs: Omit<SetEntryInput, 'sessionId'>[]
  ) => Promise<void>;
  updateSet: (id: number, input: Partial<Pick<SetEntry, 'reps' | 'weightKg' | 'rpe'>>) => Promise<void>;
  removeSet: (id: number) => Promise<void>;

  addBodyWeightEntry: (input: BodyWeightEntryInput) => Promise<void>;
  removeBodyWeightEntry: (id: number) => Promise<void>;

  addNutritionEntry: (input: NutritionEntryInput) => Promise<void>;
  updateNutritionEntry: (
    id: number,
    input: Partial<Pick<NutritionEntry, 'proteinG' | 'carbsG' | 'fatG' | 'grams'>>
  ) => Promise<void>;
  removeNutritionEntry: (id: number) => Promise<void>;

  addMeasurementEntry: (input: MeasurementEntryInput) => Promise<void>;
  removeMeasurementEntry: (id: number) => Promise<void>;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const db = useSQLiteContext();
  const { t, lang } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [sets, setSets] = useState<SetWithExercise[]>([]);
  const [bodyWeightEntries, setBodyWeightEntries] = useState<BodyWeightEntry[]>([]);
  const [nutritionEntries, setNutritionEntries] = useState<NutritionEntry[]>([]);
  const [measurementEntries, setMeasurementEntries] = useState<MeasurementEntry[]>([]);

  const reload = useCallback(async () => {
    const [ex, se, st, bw, nu, me] = await Promise.all([
      exercisesDb.getAllExercises(db),
      sessionsDb.getAllSessions(db),
      setsDb.getAllSets(db),
      bodyWeightDb.getAllBodyWeightEntries(db),
      nutritionDb.getAllNutritionEntries(db),
      measurementsDb.getAllMeasurementEntries(db),
    ]);
    setExercises(ex);
    setSessions(se);
    setSets(st);
    setBodyWeightEntries(bw);
    setNutritionEntries(nu);
    setMeasurementEntries(me);
  }, [db]);

  useEffect(() => {
    reload().finally(() => setLoading(false));
  }, [reload]);

  const addExercise = useCallback(
    async (input: ExerciseInput) => {
      const newId = await exercisesDb.insertExercise(db, input);
      if (input.isCustom) {
        await enqueue(db, 'exercise', 'create', newId);
        requestSync();
      }
      await reload();
      return newId;
    },
    [db, reload]
  );

  const updateExercise = useCallback(
    async (id: number, input: Partial<Pick<Exercise, 'name' | 'category'>>) => {
      await exercisesDb.updateExercise(db, id, input);
      const serverId = await getRowServerId(db, 'exercises', id);
      if (serverId) {
        await enqueue(db, 'exercise', 'update', id, serverId);
        requestSync();
      }
      await reload();
    },
    [db, reload]
  );

  const removeExercise = useCallback(
    async (id: number) => {
      const cancelled = await cancelPendingCreate(db, 'exercise', id);
      if (!cancelled) {
        const serverId = await getRowServerId(db, 'exercises', id);
        if (serverId) await enqueue(db, 'exercise', 'delete', id, serverId);
      }
      await exercisesDb.deleteExercise(db, id);
      await reload();
      requestSync();
    },
    [db, reload]
  );

  const addSession = useCallback(
    async (
      input: WorkoutSessionInput,
      setInputs: Omit<SetEntryInput, 'sessionId'>[]
    ) => {
      let sessionId!: number;
      await db.withTransactionAsync(async () => {
        sessionId = await sessionsDb.insertSession(db, input);
        for (const s of setInputs) {
          await setsDb.insertSet(db, { ...s, sessionId });
        }
      });
      // One combined queue entry: the session and its initial sets sync together in a single request.
      await enqueue(db, 'session', 'create', sessionId);
      await reload();
      requestSync();
      return sessionId;
    },
    [db, reload]
  );

  // Runs once per app launch: if the séance builder's draft was left over from a day that's
  // already ended — sets were logged but the user never tapped "Terminer la séance" — commit it
  // as a real session instead of leaving it stuck. loadSessionDraft only ever matches *today's*
  // date, so once midnight passes, an unfinished draft would otherwise sit invisible in storage
  // until the user thought to step the séance date picker back to find it. If the draft was mid
  // "add a forgotten exercise" to an already-closed session (stale.resuming), the original
  // session id isn't persisted, so this creates a separate session for that date rather than
  // appending to it — a minor duplicate-card quirk, not data loss.
  useEffect(() => {
    (async () => {
      const stale = await peekStaleDraft(todayKey());
      if (!stale) return;
      const setInputs = stale.activeExerciseIds.flatMap((exerciseId) =>
        (stale.draftSets[exerciseId] ?? []).map((s, i) => ({
          exerciseId,
          setNumber: i + 1,
          reps: s.reps,
          weightKg: s.weightKg,
          rpe: s.rpe,
        }))
      );
      if (setInputs.length === 0) return;
      await addSession({ date: stale.date, category: 'custom', notes: '' }, setInputs);
      await clearSessionDraft();
      Alert.alert(
        t.seance.autoValidatedTitle,
        t.seance.autoValidatedBody(formatLongDate(stale.date, LOCALE_MAP[lang]), setInputs.length)
      );
    })();
  }, [addSession, t, lang]);

  const removeSession = useCallback(
    async (id: number) => {
      const setRows = await db.getAllAsync<{ id: number }>('SELECT id FROM sets WHERE sessionId = ?', id);
      await clearQueueForLocalIds(db, 'set', setRows.map((r) => r.id));

      const cancelled = await cancelPendingCreate(db, 'session', id);
      if (!cancelled) {
        const serverId = await getRowServerId(db, 'sessions', id);
        if (serverId) await enqueue(db, 'session', 'delete', id, serverId);
      }
      await sessionsDb.deleteSession(db, id);
      await reload();
      requestSync();
    },
    [db, reload]
  );

  const addSetsToSession = useCallback(
    async (sessionId: number, setInputs: Omit<SetEntryInput, 'sessionId'>[]) => {
      for (const s of setInputs) {
        const newId = await setsDb.insertSet(db, { ...s, sessionId });
        await enqueue(db, 'set', 'create', newId);
      }
      await reload();
      requestSync();
    },
    [db, reload]
  );

  const updateSet = useCallback(
    async (id: number, input: Partial<Pick<SetEntry, 'reps' | 'weightKg' | 'rpe'>>) => {
      await setsDb.updateSet(db, id, input);
      await enqueue(db, 'set', 'update', id);
      await reload();
      requestSync();
    },
    [db, reload]
  );

  const removeSet = useCallback(
    async (id: number) => {
      const cancelled = await cancelPendingCreate(db, 'set', id);
      if (!cancelled) {
        const serverId = await getRowServerId(db, 'sets', id);
        if (serverId) await enqueue(db, 'set', 'delete', id, serverId);
      }
      await setsDb.deleteSet(db, id);
      await reload();
      requestSync();
    },
    [db, reload]
  );

  const addBodyWeightEntry = useCallback(
    async (input: BodyWeightEntryInput) => {
      const newId = await bodyWeightDb.insertBodyWeightEntry(db, input);
      await enqueue(db, 'bodyWeight', 'create', newId);
      await reload();
      requestSync();
    },
    [db, reload]
  );

  const removeBodyWeightEntry = useCallback(
    async (id: number) => {
      const cancelled = await cancelPendingCreate(db, 'bodyWeight', id);
      if (!cancelled) {
        const serverId = await getRowServerId(db, 'body_weight_entries', id);
        if (serverId) await enqueue(db, 'bodyWeight', 'delete', id, serverId);
      }
      await bodyWeightDb.deleteBodyWeightEntry(db, id);
      await reload();
      requestSync();
    },
    [db, reload]
  );

  const addNutritionEntry = useCallback(
    async (input: NutritionEntryInput) => {
      const newId = await nutritionDb.insertNutritionEntry(db, input);
      await enqueue(db, 'nutrition', 'create', newId);
      await reload();
      requestSync();
    },
    [db, reload]
  );

  const updateNutritionEntry = useCallback(
    async (
      id: number,
      input: Partial<Pick<NutritionEntry, 'proteinG' | 'carbsG' | 'fatG' | 'grams'>>
    ) => {
      await nutritionDb.updateNutritionEntry(db, id, input);
      await enqueue(db, 'nutrition', 'update', id);
      await reload();
      requestSync();
    },
    [db, reload]
  );

  const removeNutritionEntry = useCallback(
    async (id: number) => {
      const cancelled = await cancelPendingCreate(db, 'nutrition', id);
      if (!cancelled) {
        const serverId = await getRowServerId(db, 'nutrition_entries', id);
        if (serverId) await enqueue(db, 'nutrition', 'delete', id, serverId);
      }
      await nutritionDb.deleteNutritionEntry(db, id);
      await reload();
      requestSync();
    },
    [db, reload]
  );

  const addMeasurementEntry = useCallback(
    async (input: MeasurementEntryInput) => {
      const newId = await measurementsDb.insertMeasurementEntry(db, input);
      await enqueue(db, 'measurement', 'create', newId);
      await reload();
      requestSync();
    },
    [db, reload]
  );

  const removeMeasurementEntry = useCallback(
    async (id: number) => {
      const cancelled = await cancelPendingCreate(db, 'measurement', id);
      if (!cancelled) {
        const serverId = await getRowServerId(db, 'measurement_entries', id);
        if (serverId) await enqueue(db, 'measurement', 'delete', id, serverId);
      }
      await measurementsDb.deleteMeasurementEntry(db, id);
      await reload();
      requestSync();
    },
    [db, reload]
  );

  return (
    <DataContext.Provider
      value={{
        loading,
        exercises,
        sessions,
        sets,
        bodyWeightEntries,
        nutritionEntries,
        measurementEntries,
        reload,
        addExercise,
        updateExercise,
        removeExercise,
        addSession,
        removeSession,
        addSetsToSession,
        updateSet,
        removeSet,
        addBodyWeightEntry,
        removeBodyWeightEntry,
        addNutritionEntry,
        updateNutritionEntry,
        removeNutritionEntry,
        addMeasurementEntry,
        removeMeasurementEntry,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within a DataProvider');
  return ctx;
}
