import AsyncStorage from '@react-native-async-storage/async-storage';
import { DraftSet } from '../components/ExerciseSetLogger';
import { todayKey } from './date';

const STORAGE_KEY = 'seance:draft';

interface StoredSessionDraft {
  date: string;
  activeExerciseIds: number[];
  draftSets: Record<number, DraftSet[]>;
  validatedExerciseIds: number[];
  resuming: boolean;
}

export interface SessionDraftState {
  activeExerciseIds: number[];
  draftSets: Record<number, DraftSet[]>;
  validatedExerciseIds: number[];
  resuming: boolean;
}

// Snapshot of the in-progress séance builder, written on every change so a killed/crashed
// app doesn't lose sets that haven't been committed to the DB yet (commitSession runs only
// once, at "Terminer la séance").
export async function saveSessionDraft(state: SessionDraftState): Promise<void> {
  const payload: StoredSessionDraft = { ...state, date: todayKey() };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export async function loadSessionDraft(): Promise<SessionDraftState | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed: StoredSessionDraft = JSON.parse(raw);
    if (parsed.date !== todayKey()) return null;
    return {
      activeExerciseIds: parsed.activeExerciseIds,
      draftSets: parsed.draftSets,
      validatedExerciseIds: parsed.validatedExerciseIds,
      resuming: parsed.resuming,
    };
  } catch {
    return null;
  }
}

export async function clearSessionDraft(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
