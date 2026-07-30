/** Lets DataContext ask the mounted SyncEngine to run, without a direct context dependency. */
let trigger: () => void = () => {};

export function registerSyncTrigger(fn: () => void) {
  trigger = fn;
}

export function requestSync() {
  trigger();
}
