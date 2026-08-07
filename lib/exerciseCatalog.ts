import { apiFetch } from './api';
import { MuscleGroup } from '../types';

export interface CatalogEntry {
  id: number;
  name: string;
  bodyPart: string;
  equipment: string;
  target: string;
  difficulty: string | null;
}

export interface CatalogDetail extends CatalogEntry {
  secondaryMuscles: string[];
  instructions: string[];
  description: string | null;
  gifUrl: string;
}

export interface CatalogMeta {
  bodyParts: string[];
  equipment: string[];
  targets: string[];
}

export function searchCatalog(params: {
  search?: string;
  bodyPart?: string;
  equipment?: string;
  target?: string;
  limit?: number;
  offset?: number;
}): Promise<CatalogEntry[]> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') qs.set(k, String(v));
  }
  return apiFetch(`/exercise-catalog?${qs.toString()}`);
}

export function getCatalogMeta(): Promise<CatalogMeta> {
  return apiFetch('/exercise-catalog/meta');
}

export function getCatalogDetail(id: number, lang?: string): Promise<CatalogDetail> {
  const qs = lang ? `?lang=${lang}` : '';
  return apiFetch(`/exercise-catalog/${id}${qs}`);
}

/** ExerciseDB's `target` (a specific muscle) maps far more cleanly onto our fixed 8-value
 * MuscleGroup enum than its `bodyPart` (a broad region) does — used as prefill only, the
 * user still sees and can correct it before saving, so an imperfect edge case (e.g. "abs"
 * has no real home in an upper/lower-only model) is never more than a starting guess. */
const TARGET_TO_MUSCLE_GROUP: Record<string, MuscleGroup> = {
  pectorals: 'pecs',
  lats: 'dos',
  'upper back': 'dos',
  spine: 'dos',
  traps: 'dos',
  'levator scapulae': 'dos',
  delts: 'epaules',
  biceps: 'bras',
  triceps: 'bras',
  forearms: 'bras',
  'serratus anterior': 'bras',
  quads: 'quadriceps',
  hamstrings: 'ischios',
  glutes: 'fessiers',
  abductors: 'fessiers',
  adductors: 'fessiers',
  calves: 'mollets',
  abs: 'pecs',
  'cardiovascular system': 'quadriceps',
};

export function catalogTargetToMuscleGroup(target: string): MuscleGroup {
  return TARGET_TO_MUSCLE_GROUP[target] ?? 'pecs';
}
