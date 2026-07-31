import * as SecureStore from 'expo-secure-store';

const KEY_PREFIX = 'tanren_tour_seen_';

export async function hasSeenTour(userId: number): Promise<boolean> {
  const value = await SecureStore.getItemAsync(`${KEY_PREFIX}${userId}`);
  return value === '1';
}

export async function markTourSeen(userId: number): Promise<void> {
  await SecureStore.setItemAsync(`${KEY_PREFIX}${userId}`, '1');
}
