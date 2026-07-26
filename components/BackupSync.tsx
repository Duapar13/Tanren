import { useEffect, useRef } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { useData } from '../context/DataContext';
import { backupNow } from '../utils/backup';

const INTERVAL_MS = 5 * 60 * 1000;

// Headless: best-effort background backup, silently skipped when offline.
export function BackupSync() {
  const db = useSQLiteContext();
  const { loading } = useData();
  const startedRef = useRef(false);

  useEffect(() => {
    if (loading || startedRef.current) return;
    startedRef.current = true;

    backupNow(db).catch(() => {});
    const interval = setInterval(() => {
      backupNow(db).catch(() => {});
    }, INTERVAL_MS);
    return () => clearInterval(interval);
  }, [loading, db]);

  return null;
}
