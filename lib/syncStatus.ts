import { useSyncExternalStore } from 'react';
import NetInfo from '@react-native-community/netinfo';

export interface SyncStatus {
  online: boolean;
  syncing: boolean;
  /** Local changes not yet acknowledged by the server. */
  pending: number;
  lastSyncAt: number | null;
}

let state: SyncStatus = { online: true, syncing: false, pending: 0, lastSyncAt: null };
const listeners = new Set<() => void>();

export function setSyncStatus(patch: Partial<SyncStatus>): void {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function getSyncStatus(): SyncStatus {
  return state;
}

export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    () => state
  );
}

NetInfo.addEventListener((s) => {
  setSyncStatus({ online: !!s.isConnected && s.isInternetReachable !== false });
});
