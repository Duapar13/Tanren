import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import {
  BodyWeightEntry,
  BodyWeightEntryInput,
  Exercise,
  ExerciseInput,
  ProteinEntry,
  ProteinEntryInput,
  SetEntryInput,
  SetWithExercise,
  WorkoutSession,
  WorkoutSessionInput,
} from '../types';
import * as exercisesDb from '../db/exercises';
import * as sessionsDb from '../db/sessions';
import * as setsDb from '../db/sets';
import * as bodyWeightDb from '../db/bodyWeight';
import * as proteinDb from '../db/protein';

interface DataContextValue {
  loading: boolean;
  exercises: Exercise[];
  sessions: WorkoutSession[];
  sets: SetWithExercise[];
  bodyWeightEntries: BodyWeightEntry[];
  proteinEntries: ProteinEntry[];
  reload: () => Promise<void>;

  addExercise: (input: ExerciseInput) => Promise<void>;
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
  removeSet: (id: number) => Promise<void>;

  addBodyWeightEntry: (input: BodyWeightEntryInput) => Promise<void>;
  removeBodyWeightEntry: (id: number) => Promise<void>;

  addProteinEntry: (input: ProteinEntryInput) => Promise<void>;
  removeProteinEntry: (id: number) => Promise<void>;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const db = useSQLiteContext();
  const [loading, setLoading] = useState(true);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [sets, setSets] = useState<SetWithExercise[]>([]);
  const [bodyWeightEntries, setBodyWeightEntries] = useState<BodyWeightEntry[]>([]);
  const [proteinEntries, setProteinEntries] = useState<ProteinEntry[]>([]);

  const reload = useCallback(async () => {
    const [ex, se, st, bw, pr] = await Promise.all([
      exercisesDb.getAllExercises(db),
      sessionsDb.getAllSessions(db),
      setsDb.getAllSets(db),
      bodyWeightDb.getAllBodyWeightEntries(db),
      proteinDb.getAllProteinEntries(db),
    ]);
    setExercises(ex);
    setSessions(se);
    setSets(st);
    setBodyWeightEntries(bw);
    setProteinEntries(pr);
  }, [db]);

  useEffect(() => {
    reload().finally(() => setLoading(false));
  }, [reload]);

  const addExercise = useCallback(
    async (input: ExerciseInput) => {
      await exercisesDb.insertExercise(db, input);
      await reload();
    },
    [db, reload]
  );

  const removeExercise = useCallback(
    async (id: number) => {
      await exercisesDb.deleteExercise(db, id);
      await reload();
    },
    [db, reload]
  );

  const addSession = useCallback(
    async (
      input: WorkoutSessionInput,
      setInputs: Omit<SetEntryInput, 'sessionId'>[]
    ) => {
      const sessionId = await sessionsDb.insertSession(db, input);
      for (const s of setInputs) {
        await setsDb.insertSet(db, { ...s, sessionId });
      }
      await reload();
      return sessionId;
    },
    [db, reload]
  );

  const removeSession = useCallback(
    async (id: number) => {
      await sessionsDb.deleteSession(db, id);
      await reload();
    },
    [db, reload]
  );

  const addSetsToSession = useCallback(
    async (sessionId: number, setInputs: Omit<SetEntryInput, 'sessionId'>[]) => {
      for (const s of setInputs) {
        await setsDb.insertSet(db, { ...s, sessionId });
      }
      await reload();
    },
    [db, reload]
  );

  const removeSet = useCallback(
    async (id: number) => {
      await setsDb.deleteSet(db, id);
      await reload();
    },
    [db, reload]
  );

  const addBodyWeightEntry = useCallback(
    async (input: BodyWeightEntryInput) => {
      await bodyWeightDb.insertBodyWeightEntry(db, input);
      await reload();
    },
    [db, reload]
  );

  const removeBodyWeightEntry = useCallback(
    async (id: number) => {
      await bodyWeightDb.deleteBodyWeightEntry(db, id);
      await reload();
    },
    [db, reload]
  );

  const addProteinEntry = useCallback(
    async (input: ProteinEntryInput) => {
      await proteinDb.insertProteinEntry(db, input);
      await reload();
    },
    [db, reload]
  );

  const removeProteinEntry = useCallback(
    async (id: number) => {
      await proteinDb.deleteProteinEntry(db, id);
      await reload();
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
        proteinEntries,
        reload,
        addExercise,
        removeExercise,
        addSession,
        removeSession,
        addSetsToSession,
        removeSet,
        addBodyWeightEntry,
        removeBodyWeightEntry,
        addProteinEntry,
        removeProteinEntry,
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
