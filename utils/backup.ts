import { File, Paths } from 'expo-file-system';
import type { SQLiteDatabase } from 'expo-sqlite';
import { DB_NAME } from '../db/schema';

const BACKUP_SERVER = 'http://100.79.122.97:8090';
const BACKUP_SECRET = '986431d6cd1703700fedb828eeaf8a8d426413d9cb6453cd';
const APP_NAME = 'tanren';

function getDbFile(): File {
  return new File(Paths.document, 'SQLite', DB_NAME);
}

// Flushes the WAL into the main db file so the backup is self-contained
// and doesn't miss recently-committed writes still sitting in -wal.
export async function backupNow(db: SQLiteDatabase): Promise<boolean> {
  try {
    await db.execAsync('PRAGMA wal_checkpoint(TRUNCATE);');
    const file = getDbFile();
    if (!file.exists) return false;
    const base64 = await file.base64();
    const res = await fetch(`${BACKUP_SERVER}/backup/${APP_NAME}`, {
      method: 'POST',
      headers: { 'X-Backup-Secret': BACKUP_SECRET },
      body: base64,
    });
    return res.ok;
  } catch {
    return false;
  }
}

// Overwrites the local db file with the latest server backup. The app must
// be fully restarted afterwards — swapping the file under a live connection
// isn't safe, so this deliberately doesn't try to hot-reload anything.
export async function restoreLatest(): Promise<boolean> {
  try {
    const res = await fetch(`${BACKUP_SERVER}/backup/${APP_NAME}/latest`, {
      headers: { 'X-Backup-Secret': BACKUP_SECRET },
    });
    if (!res.ok) return false;
    const base64 = await res.text();

    const file = getDbFile();
    file.write(base64, { encoding: 'base64' });

    for (const suffix of ['-wal', '-shm']) {
      const sidecar = new File(Paths.document, 'SQLite', DB_NAME + suffix);
      if (sidecar.exists) sidecar.delete();
    }
    return true;
  } catch {
    return false;
  }
}
