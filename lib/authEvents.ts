const listeners = new Set<() => void>();

/** Fired by the API layer when the server explicitly rejected the refresh token (not on mere network failures). */
export function onAuthLost(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function emitAuthLost(): void {
  listeners.forEach((l) => l());
}

// When the session is lost (not an explicit logout), unsynced local data must survive: the user
// logs back into the same account and the queue drains. SyncEngine's wipe-on-logout checks this.
let skipWipeOnce = false;

export function markSkipWipe(): void {
  skipWipeOnce = true;
}

export function consumeSkipWipe(): boolean {
  const v = skipWipeOnce;
  skipWipeOnce = false;
  return v;
}
