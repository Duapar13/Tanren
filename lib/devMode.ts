import * as SecureStore from 'expo-secure-store';

/**
 * Local-only "preview" mode: lets us inject bonus rank points to see what a rank/season
 * medal looks like without needing real workout history. Never synced to the server.
 */
const DEV_PASSWORD = 'eWzbFPQzmx2tYBvT';
const BONUS_KEY = 'tanren_dev_bonus_points';

export function checkDevPassword(input: string): boolean {
  return input === DEV_PASSWORD;
}

export async function getDevBonusPoints(): Promise<number> {
  const raw = await SecureStore.getItemAsync(BONUS_KEY);
  const parsed = raw ? parseInt(raw, 10) : 0;
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function setDevBonusPoints(points: number): Promise<void> {
  await SecureStore.setItemAsync(BONUS_KEY, String(Math.round(points)));
}

export async function clearDevBonusPoints(): Promise<void> {
  await SecureStore.deleteItemAsync(BONUS_KEY);
}
