import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useSQLiteContext } from 'expo-sqlite';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { bootstrapAfterLogin, pullMissingSessions, repairOrphanedExercises, runSync, wipeLocalData } from '../lib/syncEngine';
import { registerSyncTrigger } from '../lib/syncBus';
import { getLocalDataOwner, setLocalDataOwner } from '../lib/api';

/** Headless: drains the local sync_queue to the API on login, reconnect, foreground, and after each local write. */
export function SyncEngine() {
  const db = useSQLiteContext();
  const { user } = useAuth();
  const { reload } = useData();
  const bootstrappedFor = useRef<number | null>(null);
  const previousUserId = useRef<number | null>(null);

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
      wipeLocalData(db)
        .then(reload)
        .catch((err) => console.warn('[sync] wipe on logout failed', err));
      bootstrappedFor.current = null;
      setLocalDataOwner(null).catch(() => {});
    }
    previousUserId.current = user?.id ?? null;
  }, [db, user, reload]);

  useEffect(() => {
    if (!user) return;
    (async () => {
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
        } catch (err) {
          console.warn('[sync] bootstrap failed', err);
        }
        bootstrappedFor.current = user.id;
        await setLocalDataOwner(user.id);
      }

      try {
        await pullMissingSessions(db);
        await reload();
      } catch (err) {
        console.warn('[sync] pull missing sessions failed', err);
      }

      runSync(db);
    })();
  }, [db, user, reload]);

  useEffect(() => {
    const sub = NetInfo.addEventListener((state) => {
      if (state.isConnected && user) runSync(db);
    });
    return () => sub();
  }, [db, user]);

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
