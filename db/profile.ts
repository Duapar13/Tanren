import type { SQLiteDatabase } from 'expo-sqlite';
import { Profile, ProgramType, Tier } from '../types';

export async function getProfile(db: SQLiteDatabase): Promise<Profile> {
  const row = await db.getFirstAsync<{
    tier: number;
    programType: string;
    onboardedAt: string | null;
  }>('SELECT tier, programType, onboardedAt FROM profile WHERE id = 1');

  return {
    tier: (row?.tier ?? 1) as Tier,
    programType: (row?.programType ?? 'fullbody') as ProgramType,
    onboardedAt: row?.onboardedAt ?? null,
  };
}

export async function completeOnboarding(
  db: SQLiteDatabase,
  tier: Tier
): Promise<void> {
  const programType: ProgramType = tier === 1 ? 'fullbody' : 'split';
  await db.runAsync(
    'UPDATE profile SET tier = ?, programType = ?, onboardedAt = ? WHERE id = 1',
    tier,
    programType,
    new Date().toISOString()
  );
}

export async function updateTier(db: SQLiteDatabase, tier: Tier): Promise<void> {
  const programType: ProgramType = tier === 1 ? 'fullbody' : 'split';
  await db.runAsync(
    'UPDATE profile SET tier = ?, programType = ? WHERE id = 1',
    tier,
    programType
  );
}
