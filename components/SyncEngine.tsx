import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useSQLiteContext } from 'expo-sqlite';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { bootstrapAfterLogin, runSync, wipeLocalData } from '../lib/syncEngine';
import { registerSyncTrigger } from '../lib/syncBus';

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
    }
    previousUserId.current = user?.id ?? null;
  }, [db, user, reload]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      if (bootstrappedFor.current !== user.id) {
        try {
          await bootstrapAfterLogin(db);
          await reload();
        } catch (err) {
          console.warn('[sync] bootstrap failed', err);
        }
        bootstrappedFor.current = user.id;
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
      if (next === 'active' && user) runSync(db);
    });
    return () => sub.remove();
  }, [db, user]);

  return null;
}
