import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useSQLiteContext } from 'expo-sqlite';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { bootstrapAfterLogin, pullMissingSessions, repairOrphanedExercises, runSync, wipeLocalData } from '../lib/syncEngine';
import { registerSyncTrigger } from '../lib/syncBus';
import { getLocalDataOwner, setLocalDataOwner } from '../lib/api';
import { consumeSkipWipe } from '../lib/authEvents';
import { getSyncStatus } from '../lib/syncStatus';

/** Headless: drains the local sync_queue to the API on login, reconnect, foreground, and after each local write. */
export function SyncEngine() {
  const db = useSQLiteContext();
  const { user } = useAuth();
  const { reload } = useData();
  const bootstrappedFor = useRef<number | null>(null);
  const previousUserId = useRef<number | null>(null);
  const busy = useRef(false);

  useEffect(() => {
    registerSyncTrigger(() => {
      if (user) runSync(db);
    });
    return () => registerSyncTrigger(() => {});
  }, [db, user]);

  useEffect(() => {
    // Logged out (or switched account) on this device — clear the local cache so the
    // next login's data isn't mixed with whatever the previous account left behind.
    if (!user && previousUserId.current !== null) {
      if (consumeSkipWipe()) {
        // Session expired rather than an explicit logout: keep unsynced work; the owner check
        // below wipes it only if a *different* account signs in next.
        bootstrappedFor.current = null;
      } else {
        wipeLocalData(db)
          .then(reload)
          .catch((err) => console.warn('[sync] wipe on logout failed', err));
        bootstrappedFor.current = null;
        setLocalDataOwner(null).catch(() => {});
      }
    }
    previousUserId.current = user?.id ?? null;
  }, [db, user, reload]);

  // Everything that needs the server beyond the push queue: first-time bootstrap, pulling sessions
  // created elsewhere, then draining the queue. Safe to call repeatedly and while offline — a
  // failure just leaves the app running on local data until the next trigger (reconnect/foreground).
  const catchUp = useCallback(async () => {
    if (!user || busy.current) return;
    busy.current = true;
    try {
      // Covers the case where the previous session never cleanly logged out (its token
      // just went stale while the app was closed) — the transition-based wipe above never
      // ran, so double-check against the last known owner before trusting local data.
      const owner = await getLocalDataOwner();
      if (owner !== null && owner !== user.id) {
        await wipeLocalData(db);
        await reload();
        bootstrappedFor.current = null;
      }

      if (bootstrappedFor.current !== user.id) {
        try {
          await bootstrapAfterLogin(db);
          await repairOrphanedExercises(db);
          await reload();
          bootstrappedFor.current = user.id;
          await setLocalDataOwner(user.id);
        } catch (err) {
          // Offline on launch: keep working from local data and retry on reconnect.
          console.warn('[sync] bootstrap failed', err);
        }
      }

      // Push first: pulling while local deletions are still queued would resurrect those sessions
      // from the server. Only pull once nothing local is waiting to go up.
      await runSync(db);
      if (getSyncStatus().pending === 0) {
        try {
          await pullMissingSessions(db);
          await reload();
        } catch (err) {
          console.warn('[sync] pull missing sessions failed', err);
        }
      }
    } finally {
      busy.current = false;
    }
  }, [db, user, reload]);

  useEffect(() => {
    catchUp();
  }, [catchUp]);

  useEffect(() => {
    const sub = NetInfo.addEventListener((state) => {
      if (state.isConnected && user) catchUp();
    });
    return () => sub();
  }, [user, catchUp]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next !== 'active') return;
      // A `new Date()` computed during a render only updates on the next render — if the
      // app sat backgrounded across midnight with nothing else triggering a re-render,
      // "today" stays stuck on whatever day it was when the app was last foregrounded.
      // reload() gives every consumer of useData() a fresh array reference, which forces
      // that re-render (and every date.getSessionTypeForDate/todayKey() call along with it).
      reload();
      if (user) runSync(db);
    });
    return () => sub.remove();
  }, [db, user, reload]);

  return null;
}
