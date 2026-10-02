import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'seance:draft';

export interface DraftSet {
  reps: number;
  weightKg: number;
  rpe: number | null;
}

interface StoredSessionDraft {
  date: string;
  activeExerciseIds: number[];
  draftSets: Record<number, DraftSet[]>;
  validatedExerciseIds: number[];
  resuming: boolean;
  startedAt?: number;
}

export interface SessionDraftState {
  activeExerciseIds: number[];
  draftSets: Record<number, DraftSet[]>;
  validatedExerciseIds: number[];
  resuming: boolean;
  /** Epoch ms when the workout started — drives the session chrono. */
  startedAt?: number;
}

// Snapshot of the in-progress séance builder, written on every change so a killed/crashed
// app doesn't lose sets that haven't been committed to the DB yet (commitSession runs only
// once, at "Terminer la séance"). Keyed by the session's own date (not necessarily today —
// the builder can log a past date) so switching dates mid-session can't cross-contaminate drafts.
export async function saveSessionDraft(date: string, state: SessionDraftState): Promise<void> {
  const payload: StoredSessionDraft = { ...state, date };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export async function loadSessionDraft(date: string): Promise<SessionDraftState | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed: StoredSessionDraft = JSON.parse(raw);
    if (parsed.date !== date) return null;
    return {
      activeExerciseIds: parsed.activeExerciseIds,
      draftSets: parsed.draftSets,
      validatedExerciseIds: parsed.validatedExerciseIds,
      resuming: parsed.resuming,
      startedAt: parsed.startedAt,
    };
  } catch {
    return null;
  }
}

export async function clearSessionDraft(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

/** On app launch, looks for a draft left over from a day that's already ended without the user
 * tapping "Terminer la séance" — the old day rolling over meant loadSessionDraft(todayKey())
 * would just silently miss it (different date), leaving a real logged workout stuck invisible
 * until the user thought to step the date picker back to find it. Returns null if there's nothing
 * stale, or nothing worth keeping (no sets were ever logged into it). Doesn't clear the draft
 * itself — the caller does that only after successfully committing it, so a failed auto-commit
 * can retry on the next launch instead of silently losing the data. */
export async function peekStaleDraft(today: string): Promise<(SessionDraftState & { date: string }) | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed: StoredSessionDraft = JSON.parse(raw);
    if (parsed.date >= today) return null;
    const hasSets = Object.values(parsed.draftSets ?? {}).some((list) => list.length > 0);
    if (!hasSets) return null;
    return {
      date: parsed.date,
      activeExerciseIds: parsed.activeExerciseIds,
      draftSets: parsed.draftSets,
      validatedExerciseIds: parsed.validatedExerciseIds,
      resuming: parsed.resuming,
    };
  } catch {
    return null;
  }
}
