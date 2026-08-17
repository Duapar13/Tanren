import type { SQLiteDatabase } from 'expo-sqlite';
import { apiFetch, ApiError } from './api';
import { getQueue, removeQueueItem, SyncQueueItem } from '../db/syncQueue';

type Outcome = 'ok' | 'stop' | 'drop';

function isTransient(err: unknown): boolean {
  if (err instanceof ApiError) {
    return err.status >= 500 || err.status === 401 || err.status === 429;
  }
  return true; // network error (fetch threw before getting a response)
}

async function getExerciseServerId(db: SQLiteDatabase, localId: number): Promise<number | null> {
  const row = await db.getFirstAsync<{ serverId: number | null }>(
    'SELECT serverId FROM exercises WHERE id = ?',
    localId
  );
  return row?.serverId ?? null;
}

async function processExercise(db: SQLiteDatabase, item: SyncQueueItem): Promise<Outcome> {
  if (item.operation === 'create') {
    const row = await db.getFirstAsync<{ id: number; name: string; category: string; serverId: number | null }>(
      'SELECT id, name, category, serverId FROM exercises WHERE id = ?',
      item.localId
    );
    if (!row) return 'drop';
    if (row.serverId) return 'ok';
    try {
      const created = await apiFetch('/exercises', {
        method: 'POST',
        body: JSON.stringify({ name: row.name, category: row.category }),
      });
      await db.runAsync('UPDATE exercises SET serverId = ? WHERE id = ?', created.id, row.id);
      return 'ok';
    } catch (err) {
      return isTransient(err) ? 'stop' : 'drop';
    }
  }
  if (item.operation === 'update') {
    const row = await db.getFirstAsync<{ name: string; category: string; serverId: number | null }>(
      'SELECT name, category, serverId FROM exercises WHERE id = ?',
      item.localId
    );
    if (!row) return 'drop';
    if (!row.serverId) return 'stop'; // its create should be ahead in the queue
    try {
      await apiFetch(`/exercises/${row.serverId}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: row.name, category: row.category }),
      });
      return 'ok';
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return 'ok';
      return isTransient(err) ? 'stop' : 'drop';
    }
  }
  if (item.operation === 'delete') {
    if (!item.serverId) return 'ok';
    try {
      await apiFetch(`/exercises/${item.serverId}`, { method: 'DELETE' });
      return 'ok';
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return 'ok';
      return isTransient(err) ? 'stop' : 'drop';
    }
  }
  return 'ok';
}

async function processSession(db: SQLiteDatabase, item: SyncQueueItem): Promise<Outcome> {
  if (item.operation === 'create') {
    const session = await db.getFirstAsync<{
      id: number; date: string; category: string; notes: string; serverId: number | null;
    }>('SELECT * FROM sessions WHERE id = ?', item.localId);
    if (!session) return 'drop';
    if (session.serverId) return 'ok';

    const sets = await db.getAllAsync<{
      id: number; exerciseId: number; setNumber: number; reps: number; weightKg: number; rpe: number | null;
    }>('SELECT * FROM sets WHERE sessionId = ? ORDER BY id ASC', session.id);

    const exerciseServerIds: (number | null)[] = [];
    for (const s of sets) {
      exerciseServerIds.push(await getExerciseServerId(db, s.exerciseId));
    }
    if (exerciseServerIds.some((id) => id == null)) return 'stop';

    try {
      const created = await apiFetch('/sessions', {
        method: 'POST',
        body: JSON.stringify({
          date: session.date,
          category: session.category,
          notes: session.notes,
          sets: sets.map((s, i) => ({
            exerciseId: exerciseServerIds[i],
            setNumber: s.setNumber,
            reps: s.reps,
            weightKg: s.weightKg,
            rpe: s.rpe,
          })),
        }),
      });
      await db.runAsync('UPDATE sessions SET serverId = ? WHERE id = ?', created.id, session.id);
      for (let i = 0; i < sets.length; i++) {
        const createdSet = created.sets[i];
        if (createdSet) {
          await db.runAsync('UPDATE sets SET serverId = ? WHERE id = ?', createdSet.id, sets[i].id);
        }
      }
      return 'ok';
    } catch (err) {
      return isTransient(err) ? 'stop' : 'drop';
    }
  }
  if (item.operation === 'delete') {
    if (!item.serverId) return 'ok';
    try {
      await apiFetch(`/sessions/${item.serverId}`, { method: 'DELETE' });
      return 'ok';
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return 'ok';
      return isTransient(err) ? 'stop' : 'drop';
    }
  }
  return 'ok';
}

async function processSet(db: SQLiteDatabase, item: SyncQueueItem): Promise<Outcome> {
  if (item.operation === 'create') {
    const set = await db.getFirstAsync<{
      id: number; sessionId: number; exerciseId: number; setNumber: number;
      reps: number; weightKg: number; rpe: number | null; serverId: number | null;
    }>('SELECT * FROM sets WHERE id = ?', item.localId);
    if (!set) return 'drop';
    if (set.serverId) return 'ok';

    const session = await db.getFirstAsync<{ serverId: number | null }>(
      'SELECT serverId FROM sessions WHERE id = ?',
      set.sessionId
    );
    if (!session) return 'drop';
    if (!session.serverId) return 'stop';

    const exerciseServerId = await getExerciseServerId(db, set.exerciseId);
    if (exerciseServerId == null) return 'stop';

    try {
      const created = await apiFetch(`/sessions/${session.serverId}/sets`, {
        method: 'POST',
        body: JSON.stringify({
          exerciseId: exerciseServerId,
          setNumber: set.setNumber,
          reps: set.reps,
          weightKg: set.weightKg,
          rpe: set.rpe,
        }),
      });
      await db.runAsync('UPDATE sets SET serverId = ? WHERE id = ?', created.id, set.id);
      return 'ok';
    } catch (err) {
      return isTransient(err) ? 'stop' : 'drop';
    }
  }

  if (item.operation === 'update') {
    const set = await db.getFirstAsync<{
      reps: number; weightKg: number; rpe: number | null; serverId: number | null;
    }>('SELECT reps, weightKg, rpe, serverId FROM sets WHERE id = ?', item.localId);
    if (!set) return 'drop';
    if (!set.serverId) return 'stop'; // its create should be ahead in the queue

    try {
      await apiFetch(`/sets/${set.serverId}`, {
        method: 'PATCH',
        body: JSON.stringify({ reps: set.reps, weightKg: set.weightKg, rpe: set.rpe }),
      });
      return 'ok';
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return 'ok';
      return isTransient(err) ? 'stop' : 'drop';
    }
  }

  if (item.operation === 'delete') {
    if (!item.serverId) return 'ok';
    try {
      await apiFetch(`/sets/${item.serverId}`, { method: 'DELETE' });
      return 'ok';
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return 'ok';
      return isTransient(err) ? 'stop' : 'drop';
    }
  }
  return 'ok';
}

async function processBodyWeight(db: SQLiteDatabase, item: SyncQueueItem): Promise<Outcome> {
  if (item.operation === 'create') {
    const row = await db.getFirstAsync<{ id: number; date: string; weightKg: number; serverId: number | null }>(
      'SELECT * FROM body_weight_entries WHERE id = ?',
      item.localId
    );
    if (!row) return 'drop';
    if (row.serverId) return 'ok';
    try {
      const created = await apiFetch('/body-weight', {
        method: 'POST',
        body: JSON.stringify({ date: row.date, weightKg: row.weightKg }),
      });
      await db.runAsync('UPDATE body_weight_entries SET serverId = ? WHERE id = ?', created.id, row.id);
      return 'ok';
    } catch (err) {
      return isTransient(err) ? 'stop' : 'drop';
    }
  }
  if (item.operation === 'delete') {
    if (!item.serverId) return 'ok';
    try {
      await apiFetch(`/body-weight/${item.serverId}`, { method: 'DELETE' });
      return 'ok';
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return 'ok';
      return isTransient(err) ? 'stop' : 'drop';
    }
  }
  return 'ok';
}

async function processMeasurement(db: SQLiteDatabase, item: SyncQueueItem): Promise<Outcome> {
  if (item.operation === 'create') {
    const row = await db.getFirstAsync<{ id: number; date: string; type: string; valueCm: number; serverId: number | null }>(
      'SELECT * FROM measurement_entries WHERE id = ?',
      item.localId
    );
    if (!row) return 'drop';
    if (row.serverId) return 'ok';
    try {
      const created = await apiFetch('/measurements', {
        method: 'POST',
        body: JSON.stringify({ date: row.date, type: row.type, valueCm: row.valueCm }),
      });
      await db.runAsync('UPDATE measurement_entries SET serverId = ? WHERE id = ?', created.id, row.id);
      return 'ok';
    } catch (err) {
      return isTransient(err) ? 'stop' : 'drop';
    }
  }
  if (item.operation === 'delete') {
    if (!item.serverId) return 'ok';
    try {
      await apiFetch(`/measurements/${item.serverId}`, { method: 'DELETE' });
      return 'ok';
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return 'ok';
      return isTransient(err) ? 'stop' : 'drop';
    }
  }
  return 'ok';
}

async function processNutrition(db: SQLiteDatabase, item: SyncQueueItem): Promise<Outcome> {
  if (item.operation === 'create') {
    const row = await db.getFirstAsync<{
      id: number; date: string; proteinG: number; carbsG: number; fatG: number;
      foodName: string | null; grams: number | null; unit: string | null; barcode: string | null;
      serverId: number | null;
    }>('SELECT * FROM nutrition_entries WHERE id = ?', item.localId);
    if (!row) return 'drop';
    if (row.serverId) return 'ok';
    try {
      const created = await apiFetch('/nutrition/entries', {
        method: 'POST',
        body: JSON.stringify({
          date: row.date,
          proteinG: row.proteinG,
          carbsG: row.carbsG,
          fatG: row.fatG,
          foodName: row.foodName,
          grams: row.grams,
          unit: row.unit,
          barcode: row.barcode,
        }),
      });
      await db.runAsync('UPDATE nutrition_entries SET serverId = ? WHERE id = ?', created.id, row.id);
      return 'ok';
    } catch (err) {
      return isTransient(err) ? 'stop' : 'drop';
    }
  }
  if (item.operation === 'update') {
    const row = await db.getFirstAsync<{
      proteinG: number; carbsG: number; fatG: number; grams: number | null; serverId: number | null;
    }>('SELECT proteinG, carbsG, fatG, grams, serverId FROM nutrition_entries WHERE id = ?', item.localId);
    if (!row) return 'drop';
    if (!row.serverId) return 'stop'; // its create should be ahead in the queue
    try {
      await apiFetch(`/nutrition/entries/${row.serverId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          proteinG: row.proteinG,
          carbsG: row.carbsG,
          fatG: row.fatG,
          grams: row.grams,
        }),
      });
      return 'ok';
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return 'ok';
      return isTransient(err) ? 'stop' : 'drop';
    }
  }
  if (item.operation === 'delete') {
    if (!item.serverId) return 'ok';
    try {
      await apiFetch(`/nutrition/entries/${item.serverId}`, { method: 'DELETE' });
      return 'ok';
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return 'ok';
      return isTransient(err) ? 'stop' : 'drop';
    }
  }
  return 'ok';
}

async function processWorkoutTemplate(db: SQLiteDatabase, item: SyncQueueItem): Promise<Outcome> {
  if (item.operation === 'create') {
    const template = await db.getFirstAsync<{ id: number; name: string; serverId: number | null }>(
      'SELECT id, name, serverId FROM workout_templates WHERE id = ?',
      item.localId
    );
    if (!template) return 'drop';
    if (template.serverId) return 'ok';

    const links = await db.getAllAsync<{ exerciseId: number }>(
      'SELECT exerciseId FROM workout_template_exercises WHERE templateId = ? ORDER BY orderIndex',
      template.id
    );
    const exerciseServerIds: (number | null)[] = [];
    for (const link of links) {
      exerciseServerIds.push(await getExerciseServerId(db, link.exerciseId));
    }
    if (exerciseServerIds.some((id) => id == null)) return 'stop';

    try {
      const created = await apiFetch('/workout-templates', {
        method: 'POST',
        body: JSON.stringify({ name: template.name, exerciseIds: exerciseServerIds }),
      });
      await db.runAsync('UPDATE workout_templates SET serverId = ? WHERE id = ?', created.id, template.id);
      return 'ok';
    } catch (err) {
      return isTransient(err) ? 'stop' : 'drop';
    }
  }
  if (item.operation === 'delete') {
    if (!item.serverId) return 'ok';
    try {
      await apiFetch(`/workout-templates/${item.serverId}`, { method: 'DELETE' });
      return 'ok';
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return 'ok';
      return isTransient(err) ? 'stop' : 'drop';
    }
  }
  return 'ok';
}

async function processItem(db: SQLiteDatabase, item: SyncQueueItem): Promise<Outcome> {
  switch (item.entity) {
    case 'exercise':
      return processExercise(db, item);
    case 'session':
      return processSession(db, item);
    case 'set':
      return processSet(db, item);
    case 'bodyWeight':
      return processBodyWeight(db, item);
    case 'nutrition':
      return processNutrition(db, item);
    case 'measurement':
      return processMeasurement(db, item);
    case 'workoutTemplate':
      return processWorkoutTemplate(db, item);
    default:
      return 'drop';
  }
}

export async function wipeLocalData(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    DELETE FROM sets;
    DELETE FROM sessions;
    DELETE FROM body_weight_entries;
    DELETE FROM nutrition_entries;
    DELETE FROM measurement_entries;
    DELETE FROM workout_template_exercises;
    DELETE FROM workout_templates;
    DELETE FROM exercises WHERE isCustom = 1;
    UPDATE exercises SET serverId = NULL;
    DELETE FROM sync_queue;
  `);
}

let running = false;
let queuedRerun = false;

export async function runSync(db: SQLiteDatabase): Promise<void> {
  if (running) {
    queuedRerun = true;
    return;
  }
  running = true;
  try {
    const queue = await getQueue(db);
    for (const item of queue) {
      const outcome = await processItem(db, item);
      if (outcome === 'stop') break;
      await removeQueueItem(db, item.id);
      if (outcome === 'drop') {
        console.warn(`[sync] dropped ${item.entity} ${item.operation} #${item.localId} (permanent error)`);
      }
    }
  } catch (err) {
    console.warn('[sync] run failed', err);
  } finally {
    running = false;
    if (queuedRerun) {
      queuedRerun = false;
      runSync(db);
    }
  }
}

interface ServerExercise {
  id: number;
  name: string;
  category: string;
  muscleGroup: string | null;
  isCustom: boolean;
  deletedAt: string | null;
}

// One-time repair for exercises that were hard-deleted locally before the switch to soft
// delete: their sets.exerciseId now points nowhere locally, so they display as "Exercice
// supprimé" even though the server still has the row (its own DELETE failed on the
// fk_set_exercise constraint, since a hard delete was never actually possible once history
// existed). Re-inserts the missing exercise locally at the exact id its orphaned sets already
// reference, so no set needs to be touched — only runs the (safe, order-independent) 1-orphan
// case automatically; anything more ambiguous is left alone rather than risk a wrong pairing.
export async function repairOrphanedExercises(db: SQLiteDatabase): Promise<void> {
  const orphaned = await db.getAllAsync<{ exerciseId: number }>(
    'SELECT DISTINCT exerciseId FROM sets WHERE exerciseId NOT IN (SELECT id FROM exercises)'
  );
  if (orphaned.length === 0) return;

  const localServerIds = new Set(
    (
      await db.getAllAsync<{ serverId: number }>('SELECT serverId FROM exercises WHERE serverId IS NOT NULL')
    ).map((r) => r.serverId)
  );

  let serverExercises: ServerExercise[];
  try {
    serverExercises = await apiFetch('/exercises');
  } catch {
    return; // offline — retried on next bootstrap pass
  }
  const missingFromLocal = serverExercises.filter((se) => !localServerIds.has(se.id));

  if (orphaned.length !== 1 || missingFromLocal.length !== 1) {
    if (orphaned.length > 0) {
      console.warn(
        `[repair] ${orphaned.length} orphaned exercise id(s), ${missingFromLocal.length} candidate(s) on server — ambiguous, skipping`
      );
    }
    return;
  }

  const se = missingFromLocal[0];
  await db.runAsync(
    'INSERT INTO exercises (id, name, category, muscleGroup, isCustom, createdAt, serverId, deletedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    orphaned[0].exerciseId,
    se.name,
    se.category,
    se.muscleGroup ?? 'pecs',
    se.isCustom ? 1 : 0,
    new Date().toISOString(),
    se.id,
    se.deletedAt ?? new Date().toISOString()
  );
}

export async function bootstrapAfterLogin(db: SQLiteDatabase): Promise<void> {
  const serverExercises: ServerExercise[] = await apiFetch('/exercises');

  for (const se of serverExercises.filter((e) => !e.isCustom)) {
    await db.runAsync(
      'UPDATE exercises SET serverId = ? WHERE name = ? AND serverId IS NULL',
      se.id,
      se.name
    );
  }

  const counts = await db.getFirstAsync<{
    sessions: number;
    bw: number;
    nu: number;
    customEx: number;
  }>(`SELECT
      (SELECT COUNT(*) FROM sessions) as sessions,
      (SELECT COUNT(*) FROM body_weight_entries) as bw,
      (SELECT COUNT(*) FROM nutrition_entries) as nu,
      (SELECT COUNT(*) FROM exercises WHERE isCustom = 1) as customEx
  `);
  const isEmpty =
    !!counts && counts.sessions === 0 && counts.bw === 0 && counts.nu === 0 && counts.customEx === 0;
  if (!isEmpty) return;

  const now = new Date().toISOString();

  // Insert every server exercise this device doesn't already have a serverId match for — not
  // just custom ones. The name-match pass above can miss a default exercise (any drift between
  // this build's seed list and the server's), and a set whose exercise never resolves locally
  // gets silently skipped below — this guarantees full coverage so that can't happen.
  const alreadyMatched = new Set(
    (
      await db.getAllAsync<{ serverId: number }>('SELECT serverId FROM exercises WHERE serverId IS NOT NULL')
    ).map((r) => r.serverId)
  );
  for (const se of serverExercises) {
    if (alreadyMatched.has(se.id)) continue;
    await db.runAsync(
      'INSERT INTO exercises (name, category, muscleGroup, isCustom, createdAt, serverId, deletedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
      se.name,
      se.category,
      se.muscleGroup ?? 'pecs',
      se.isCustom ? 1 : 0,
      now,
      se.id,
      se.deletedAt
    );
  }

  const localExercises = await db.getAllAsync<{ id: number; serverId: number }>(
    'SELECT id, serverId FROM exercises WHERE serverId IS NOT NULL'
  );
  const exerciseServerToLocal = new Map(localExercises.map((e) => [e.serverId, e.id]));

  const sessions: { id: number }[] = await apiFetch('/sessions');
  for (const s of sessions) {
    const detail = await apiFetch(`/sessions/${s.id}`);
    const result = await db.runAsync(
      'INSERT INTO sessions (date, category, notes, createdAt, serverId) VALUES (?, ?, ?, ?, ?)',
      detail.date,
      detail.category,
      detail.notes ?? '',
      detail.startedAt ?? now,
      detail.id
    );
    const localSessionId = result.lastInsertRowId;
    for (const st of detail.sets) {
      const localExerciseId = exerciseServerToLocal.get(st.exerciseId);
      if (!localExerciseId) continue;
      await db.runAsync(
        'INSERT INTO sets (sessionId, exerciseId, setNumber, reps, weightKg, rpe, createdAt, serverId) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        localSessionId,
        localExerciseId,
        st.setNumber,
        st.reps,
        st.weightKg,
        st.rpe,
        now,
        st.id
      );
    }
  }

  const bodyWeights: { id: number; date: string; weightKg: number }[] = await apiFetch('/body-weight');
  for (const bw of bodyWeights) {
    await db.runAsync(
      'INSERT INTO body_weight_entries (date, weightKg, createdAt, serverId) VALUES (?, ?, ?, ?)',
      bw.date,
      bw.weightKg,
      now,
      bw.id
    );
  }

  const nutrition: {
    id: number; date: string; proteinG: number; carbsG: number; fatG: number;
    foodName: string | null; grams: number | null; unit: string | null; barcode: string | null;
  }[] = await apiFetch('/nutrition/entries');
  for (const n of nutrition) {
    await db.runAsync(
      'INSERT INTO nutrition_entries (date, proteinG, carbsG, fatG, foodName, grams, unit, barcode, createdAt, serverId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      n.date,
      n.proteinG,
      n.carbsG,
      n.fatG,
      n.foodName,
      n.grams,
      n.unit,
      n.barcode,
      now,
      n.id
    );
  }

  const measurements: { id: number; date: string; type: string; valueCm: number }[] =
    await apiFetch('/measurements');
  for (const m of measurements) {
    await db.runAsync(
      'INSERT INTO measurement_entries (date, type, valueCm, createdAt, serverId) VALUES (?, ?, ?, ?, ?)',
      m.date,
      m.type,
      m.valueCm,
      now,
      m.id
    );
  }

  const templates: { id: number; name: string; exerciseIds: number[] }[] =
    await apiFetch('/workout-templates');
  for (const tpl of templates) {
    const result = await db.runAsync(
      'INSERT INTO workout_templates (name, createdAt, serverId) VALUES (?, ?, ?)',
      tpl.name,
      now,
      tpl.id
    );
    const localTemplateId = result.lastInsertRowId;
    for (let i = 0; i < tpl.exerciseIds.length; i++) {
      const localExerciseId = exerciseServerToLocal.get(tpl.exerciseIds[i]);
      if (!localExerciseId) continue;
      await db.runAsync(
        'INSERT INTO workout_template_exercises (templateId, exerciseId, orderIndex) VALUES (?, ?, ?)',
        localTemplateId,
        localExerciseId,
        i
      );
    }
  }
}

/** bootstrapAfterLogin only ever pulls from the server when the local cache is completely empty
 * (fresh install) — sync itself is push-only after that (runSync drains the local queue up to the
 * server, nothing pulls the other way). That leaves no recovery path for a session that ends up
 * existing server-side (support/data-recovery, or a device that never finished its own bootstrap)
 * but isn't mirrored locally. This reconciles that gap on every launch: cheap when there's nothing
 * missing (one GET /sessions), and safe to repeat since it only inserts sessions whose serverId
 * isn't already present locally. */
export async function pullMissingSessions(db: SQLiteDatabase): Promise<void> {
  const serverSessions: { id: number }[] = await apiFetch('/sessions');
  if (serverSessions.length === 0) return;

  const localServerIds = new Set(
    (
      await db.getAllAsync<{ serverId: number }>('SELECT serverId FROM sessions WHERE serverId IS NOT NULL')
    ).map((r) => r.serverId)
  );
  const missing = serverSessions.filter((s) => !localServerIds.has(s.id));
  if (missing.length === 0) return;

  const localExercises = await db.getAllAsync<{ id: number; serverId: number }>(
    'SELECT id, serverId FROM exercises WHERE serverId IS NOT NULL'
  );
  const exerciseServerToLocal = new Map(localExercises.map((e) => [e.serverId, e.id]));
  const now = new Date().toISOString();

  for (const s of missing) {
    const detail = await apiFetch(`/sessions/${s.id}`);
    const result = await db.runAsync(
      'INSERT INTO sessions (date, category, notes, createdAt, serverId) VALUES (?, ?, ?, ?, ?)',
      detail.date,
      detail.category,
      detail.notes ?? '',
      detail.startedAt ?? now,
      detail.id
    );
    const localSessionId = result.lastInsertRowId;
    for (const st of detail.sets) {
      const localExerciseId = exerciseServerToLocal.get(st.exerciseId);
      if (!localExerciseId) continue;
      await db.runAsync(
        'INSERT INTO sets (sessionId, exerciseId, setNumber, reps, weightKg, rpe, createdAt, serverId) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        localSessionId,
        localExerciseId,
        st.setNumber,
        st.reps,
        st.weightKg,
        st.rpe,
        now,
        st.id
      );
    }
  }
}
