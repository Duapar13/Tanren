import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'ningyma:placementRevealShownForSeason';

/** Placement's reveal animation should only ever play once per season, the first time the app
 * notices the player has crossed from "in placement" to "placed" — not every time they open the
 * Rang/Accueil tab afterward. Keyed by season number so a new season's own placement naturally
 * gets its own reveal later. */
export async function hasShownPlacementReveal(seasonNumber: number): Promise<boolean> {
  const shown = await AsyncStorage.getItem(STORAGE_KEY);
  return shown === String(seasonNumber);
}

export async function markPlacementRevealShown(seasonNumber: number): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, String(seasonNumber));
}
