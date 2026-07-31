// weight_kg is DECIMAL(6,2) — anything at or past 9999.99 would 500 on insert instead of
// cleanly rejecting, and a client that keeps retrying a 500 forever (isTransient) never
// clears it from its local sync queue. Reject bad values with a 400 so it drops instead.
export function isValidWeightKg(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value < 1000;
}

export function isValidReps(value) {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 500;
}
