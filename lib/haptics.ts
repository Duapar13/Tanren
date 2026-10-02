import { Platform, Vibration } from 'react-native';
import { getPreference } from './preferences';

// Only react-native's built-in Vibration is available over the air (the native haptics module
// would need a new store build). On iOS it ignores the duration and always buzzes ~0.4s, which is
// far too heavy for a button tap — so iOS only gets feedback for the big moments (records, finish).
// Android honours short durations and patterns, so it gets the finer-grained taps too.

const isAndroid = Platform.OS === 'android';

function vibrate(pattern: number | number[]): void {
  if (!getPreference('hapticsEnabled')) return;
  Vibration.vibrate(pattern);
}

export const haptics = {
  /** Light tick: stepper buttons, selection changes. */
  tap(): void {
    if (isAndroid) vibrate(8);
  },
  /** A set was logged. */
  success(): void {
    if (isAndroid) vibrate([0, 18, 40, 18]);
  },
  /** A personal record was broken. */
  record(): void {
    vibrate(isAndroid ? [0, 40, 60, 40, 60, 90] : 400);
  },
  /** The workout was finished. */
  finish(): void {
    vibrate(isAndroid ? [0, 60, 80, 120] : 400);
  },
};
