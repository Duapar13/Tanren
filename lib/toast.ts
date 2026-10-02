import { useSyncExternalStore } from 'react';
import type { NinjaReaction } from '../components/mascot/GymaFigure';

export interface Toast {
  id: number;
  message: string;
  reaction: NinjaReaction;
}

let current: Toast | null = null;
let nextId = 1;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

/** Shows a short message carried by Gyma, replacing any toast already on screen. */
export function showToast(message: string, reaction: NinjaReaction = 'happy'): void {
  current = { id: nextId++, message, reaction };
  emit();
}

export function hideToast(id: number): void {
  if (current?.id !== id) return;
  current = null;
  emit();
}

export function useToast(): Toast | null {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    () => current
  );
}
