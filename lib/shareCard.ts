import { RefObject } from 'react';
import { View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';

/** Captures the given card view as a PNG and hands it to the native share sheet — the user
 * picks Instagram/Snapchat/Messages/etc. from there like any other OS-level share action. */
export async function shareCardAsImage(ref: RefObject<View | null>): Promise<void> {
  const uri = await captureRef(ref, { format: 'png', quality: 1 });
  const available = await Sharing.isAvailableAsync();
  if (!available) throw new Error('sharing_unavailable');
  await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Partager ta fiche Ningyma' });
}
