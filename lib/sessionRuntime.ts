// True while the workout screen is mounted. The stale-draft auto-save (DataContext) must not touch a
// draft that is actively being edited, e.g. a workout that runs past midnight.
let open = false;

export function setSessionScreenOpen(value: boolean): void {
  open = value;
}

export function isSessionScreenOpen(): boolean {
  return open;
}
