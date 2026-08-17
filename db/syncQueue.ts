import type { SQLiteDatabase } from 'expo-sqlite';

export type SyncEntity =
  | 'exercise'
  | 'session'
  | 'set'
  | 'bodyWeight'
  | 'nutrition'
  | 'measurement'
  | 'workoutTemplate';
export type SyncOperation = 'create' | 'update' | 'delete';

export interface SyncQueueItem {
  id: number;
  entity: SyncEntity;
  operation: SyncOperation;
  localId: number;
  serverId: number | null;
  createdAt: string;
}

export async function enqueue(
  db: SQLiteDatabase,
  entity: SyncEntity,
  operation: SyncOperation,
  localId: number,
  serverId: number | null = null
): Promise<void> {
  await db.runAsync(
    'INSERT INTO sync_queue (entity, operation, localId, serverId, createdAt) VALUES (?, ?, ?, ?, ?)',
    entity,
    operation,
    localId,
    serverId,
    new Date().toISOString()
  );
}

/** If a 'create' for this row is still pending (never synced), cancel it instead of queuing a delete. Returns true if cancelled. */
export async function cancelPendingCreate(
  db: SQLiteDatabase,
  entity: SyncEntity,
  localId: number
): Promise<boolean> {
  const pending = await db.getFirstAsync<{ id: number }>(
    "SELECT id FROM sync_queue WHERE entity = ? AND localId = ? AND operation = 'create'",
    entity,
    localId
  );
  if (!pending) return false;
  await db.runAsync('DELETE FROM sync_queue WHERE id = ?', pending.id);
  return true;
}

/** Drop any queued operations referencing sets that are about to be cascade-deleted with their session. */
export async function clearQueueForLocalIds(
  db: SQLiteDatabase,
  entity: SyncEntity,
  localIds: number[]
): Promise<void> {
  if (localIds.length === 0) return;
  const placeholders = localIds.map(() => '?').join(',');
  await db.runAsync(
    `DELETE FROM sync_queue WHERE entity = ? AND localId IN (${placeholders})`,
    entity,
    ...localIds
  );
}

export async function getQueue(db: SQLiteDatabase): Promise<SyncQueueItem[]> {
  return db.getAllAsync<SyncQueueItem>('SELECT * FROM sync_queue ORDER BY id ASC');
}

export async function removeQueueItem(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM sync_queue WHERE id = ?', id);
}

export async function getRowServerId(
  db: SQLiteDatabase,
  table:
    | 'exercises'
    | 'sessions'
    | 'sets'
    | 'body_weight_entries'
    | 'nutrition_entries'
    | 'measurement_entries'
    | 'workout_templates',
  id: number
): Promise<number | null> {
  const row = await db.getFirstAsync<{ serverId: number | null }>(
    `SELECT serverId FROM ${table} WHERE id = ?`,
    id
  );
  return row?.serverId ?? null;
}
