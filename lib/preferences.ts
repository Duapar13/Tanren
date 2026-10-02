import { useSyncExternalStore } from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'system' | 'light' | 'dark';

interface Preferences {
  themeMode: ThemeMode;
  showLeaderboard: boolean;
  hapticsEnabled: boolean;
  reminderEnabled: boolean;
  reminderHour: number;
  reminderMinute: number;
}

const STORAGE_KEY = 'ningyma:preferences';
const DEFAULTS: Preferences = {
  themeMode: 'system',
  showLeaderboard: true,
  hapticsEnabled: true,
  reminderEnabled: false,
  reminderHour: 18,
  reminderMinute: 0,
};

let current: Preferences = DEFAULTS;
const listeners = new Set<() => void>();

function applyThemeMode(mode: ThemeMode) {
  // Appearance drives useColorScheme(), native Switch/keyboard/alert styling and the status bar
  // all at once, so overriding it here is enough — no separate theme context needed.
  Appearance.setColorScheme(mode === 'system' ? null : mode);
}

function emit() {
  listeners.forEach((l) => l());
}

export async function loadPreferences(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) current = { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    // Corrupt/missing storage — fall back to defaults.
  }
  applyThemeMode(current.themeMode);
  emit();
}

export function setPreference<K extends keyof Preferences>(key: K, value: Preferences[K]): void {
  current = { ...current, [key]: value };
  if (key === 'themeMode') applyThemeMode(value as ThemeMode);
  emit();
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(current)).catch(() => {});
}

export function getPreference<K extends keyof Preferences>(key: K): Preferences[K] {
  return current[key];
}

export function usePreference<K extends keyof Preferences>(key: K): Preferences[K] {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => current[key]
  );
}
