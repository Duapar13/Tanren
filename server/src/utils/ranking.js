// Server-side port of utils/ranking.ts — kept as close to the client version as possible so
// the two never silently drift. This is the authority for leaderboard points: the client still
// computes and displays its own ranking locally (for instant UI, offline, etc.), but what gets
// stored for the leaderboard is always recomputed here from the user's own synced rows, never
// trusted from the request body. A client can send whatever "points" it wants; it's ignored.

export const RANKS = [
  'Fer',
  'Bronze',
  'Argent',
  'Or',
  'Améthyste',
  'Émeraude',
  'Rubis',
  'Saphir',
  'Légende',
  'Divin',
  'Master Divin',
  'Grand Master Divin',
  'Ultime',
];
export const DIVISIONS = ['IV', 'III', 'II', 'I'];
export const POINTS_PER_DIVISION = 100;
const TOTAL_TIERS = RANKS.length * DIVISIONS.length;
const MAX_POINTS = TOTAL_TIERS * POINTS_PER_DIVISION;

function tierFromPoints(rawPoints) {
  const totalPoints = Math.max(0, Math.min(Math.round(rawPoints), MAX_POINTS - 1));
  const tierIndex = Math.floor(totalPoints / POINTS_PER_DIVISION);
  const rank = RANKS[Math.floor(tierIndex / DIVISIONS.length)];
  const division = DIVISIONS[tierIndex % DIVISIONS.length];
  return { totalPoints, rank, division };
}

const SEASON_EPOCH_YEAR = 2026;
const SEASON_EPOCH_HALF = 2;
const SEASON_EPOCH_HALF_INDEX = SEASON_EPOCH_YEAR * 2 + (SEASON_EPOCH_HALF - 1);

function seasonInfoForHalfIndex(halfIndex) {
  const year = Math.floor(halfIndex / 2);
  const half = (halfIndex % 2) + 1;
  const seasonNumber = halfIndex - SEASON_EPOCH_HALF_INDEX + 1;
  const startMonth = half === 1 ? 0 : 6;
  const start = new Date(year, startMonth, 1);
  const end = new Date(year, startMonth + 6, 0);
  return { seasonNumber, half, year, startDate: toDateKey(start), endDate: toDateKey(end) };
}

export function seasonInfoForNumber(seasonNumber) {
  return seasonInfoForHalfIndex(seasonNumber - 1 + SEASON_EPOCH_HALF_INDEX);
}

function halfIndexForDate(date) {
  const year = date.getFullYear();
  const half = date.getMonth() < 6 ? 1 : 2;
  return year * 2 + (half - 1);
}

export function currentSeasonInfo(date = new Date()) {
  return seasonInfoForHalfIndex(halfIndexForDate(date));
}

function toDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function todayKey() {
  return toDateKey(new Date());
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

const DEFAULT_TRAINING_DAYS = [1, 2, 3, 4, 5];

function isTrainingDay(date, trainingDays) {
  const days = trainingDays.length > 0 ? trainingDays : DEFAULT_TRAINING_DAYS;
  return days.includes(date.getDay());
}

// Épley formula.
export function estimate1RM(weightKg, reps) {
  if (reps <= 0) return 0;
  if (reps === 1) return weightKg;
  return weightKg * (1 + reps / 30);
}

const GOAL_CALORIE_MULTIPLIER = { bulk: 1.1, cut: 0.8, maintain: 1 };

function macroTargets(bodyWeightKg, goal) {
  const maintenanceCalories = bodyWeightKg * 33;
  const calories = Math.round(maintenanceCalories * (GOAL_CALORIE_MULTIPLIER[goal] ?? 1));
  const proteinG = Math.round(bodyWeightKg * 1.8);
  const fatG = Math.round((calories * 0.25) / 9);
  const carbsG = Math.max(0, Math.round((calories - proteinG * 4 - fatG * 9) / 4));
  return { calories, proteinG, fatG, carbsG };
}

function computeStreakEvents(sessions, trainingDays, accountCreatedAt, rangeStart, rangeEnd) {
  if (trainingDays.length === 0) return [];
  const loggedDates = new Set(sessions.map((s) => s.date));
  const events = [];
  const effectiveStart = rangeStart < accountCreatedAt ? accountCreatedAt : rangeStart;
  let cursor = new Date(`${effectiveStart}T00:00:00`);
  let cursorKey = toDateKey(cursor);
  const today = todayKey();
  while (cursorKey <= rangeEnd) {
    if (isTrainingDay(cursor, trainingDays)) {
      if (loggedDates.has(cursorKey)) {
        events.push({ date: cursorKey, points: 10, source: 'streak' });
      } else if (cursorKey < today) {
        events.push({ date: cursorKey, points: -15, source: 'streak' });
      }
    }
    cursor = addDays(cursor, 1);
    cursorKey = toDateKey(cursor);
  }
  return events;
}

function computePRPoints(sets, sessions, rangeStart, rangeEnd) {
  const dateBySession = new Map(sessions.map((s) => [s.id, s.date]));

  const bestBySessionExercise = new Map();
  for (const s of sets) {
    const date = dateBySession.get(s.sessionId);
    if (!date) continue;
    const est = estimate1RM(s.weightKg, s.reps);
    const key = `${s.sessionId}:${s.exerciseId}`;
    const existing = bestBySessionExercise.get(key);
    if (!existing || est > existing.est) {
      bestBySessionExercise.set(key, { date, exerciseId: s.exerciseId, est });
    }
  }

  const bestsByExercise = new Map();
  for (const best of bestBySessionExercise.values()) {
    if (!bestsByExercise.has(best.exerciseId)) bestsByExercise.set(best.exerciseId, []);
    bestsByExercise.get(best.exerciseId).push(best);
  }

  const events = [];
  for (const sessionBests of bestsByExercise.values()) {
    const sorted = [...sessionBests].sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? -1 : 1));
    let allTimeBest = 0;
    for (const sb of sorted) {
      if (allTimeBest === 0) {
        allTimeBest = sb.est;
        continue;
      }
      if (sb.est > allTimeBest) {
        if (sb.date >= rangeStart && sb.date <= rangeEnd) {
          const points = Math.min(40, 10 + Math.round(((sb.est - allTimeBest) / allTimeBest) * 100));
          events.push({ date: sb.date, points, source: 'pr' });
        }
        allTimeBest = sb.est;
      }
    }
  }
  return events;
}

function computeNutritionEvents(nutritionEntries, bodyWeightEntries, goal, rangeStart, rangeEnd) {
  const currentWeight = bodyWeightEntries.length > 0 ? bodyWeightEntries[0].weightKg : null;
  if (!currentWeight) return [];
  const targets = macroTargets(currentWeight, goal);
  const today = todayKey();

  const caloriesByDate = new Map();
  for (const e of nutritionEntries) {
    if (e.date < rangeStart || e.date > rangeEnd || e.date >= today) continue;
    const calories = e.proteinG * 4 + e.carbsG * 4 + e.fatG * 9;
    caloriesByDate.set(e.date, (caloriesByDate.get(e.date) ?? 0) + calories);
  }

  const events = [];
  for (const [date, calories] of caloriesByDate) {
    const ratio = calories / targets.calories;
    if (ratio >= 0.85 && ratio <= 1.15) {
      events.push({ date, points: 5, source: 'nutrition' });
    }
  }
  return events;
}

const SHRINK_IS_PROGRESS = ['waist', 'hips'];

function isMeasurementImprovement(type, prevCm, newCm, goal) {
  if (SHRINK_IS_PROGRESS.includes(type)) return goal !== 'bulk' && newCm < prevCm;
  return newCm > prevCm;
}

function computeMeasurementEvents(measurementEntries, goal, rangeStart, rangeEnd) {
  const events = [];

  const loggedDates = new Set(
    measurementEntries.filter((e) => e.date >= rangeStart && e.date <= rangeEnd).map((e) => e.date)
  );
  for (const date of loggedDates) {
    events.push({ date, points: 3, source: 'measurement' });
  }

  const byType = new Map();
  for (const e of measurementEntries) {
    if (!byType.has(e.type)) byType.set(e.type, []);
    byType.get(e.type).push(e);
  }
  for (const [type, entries] of byType) {
    const sorted = [...entries].sort((a, b) => (a.date === b.date ? a.id - b.id : a.date < b.date ? -1 : 1));
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      if (curr.date < rangeStart || curr.date > rangeEnd) continue;
      if (isMeasurementImprovement(type, prev.valueCm, curr.valueCm, goal)) {
        events.push({ date: curr.date, points: 8, source: 'measurement' });
      }
    }
  }

  return events;
}

const PERFORMANCE_POINTS_PER_EXERCISE = 5;
const PERFORMANCE_POINTS_CAP = 30;

/**
 * Bonus for currently sitting above the community's average best estimated 1RM on a given
 * exercise (matched by name — see fetchGlobalExerciseAverages in routes/leaderboard.js for
 * why). Needs everyone's data to compute the average, so this is server-only by design — the
 * client's own local copy of this formula (utils/ranking.ts) has no such function and never
 * will, since a device only ever syncs its own user's rows.
 * globalAverages: Map<lowercased exercise name, avgBestEst1RM> — built by the caller.
 * Dated "today" rather than to a specific session, since it reflects current standing, not
 * a one-off historical event.
 */
function computePerformanceEvents(sets, globalAverages, today) {
  if (!globalAverages || globalAverages.size === 0) return [];

  const bestByExercise = new Map();
  for (const s of sets) {
    if (!s.exerciseName) continue;
    const est = estimate1RM(s.weightKg, s.reps);
    const existing = bestByExercise.get(s.exerciseName);
    if (!existing || est > existing) bestByExercise.set(s.exerciseName, est);
  }

  const events = [];
  let total = 0;
  for (const [exerciseName, best] of bestByExercise) {
    if (total >= PERFORMANCE_POINTS_CAP) break;
    const avg = globalAverages.get(exerciseName);
    if (avg && best > avg) {
      events.push({ date: today, points: PERFORMANCE_POINTS_PER_EXERCISE, source: 'performance' });
      total += PERFORMANCE_POINTS_PER_EXERCISE;
    }
  }
  return events;
}

/**
 * params: { sessions:[{id,date}], sets:[{sessionId,exerciseId,exerciseName,weightKg,reps}],
 *   nutritionEntries:[{date,proteinG,carbsG,fatG}], bodyWeightEntries:[{weightKg}] (DESC by date),
 *   measurementEntries:[{id,date,type,valueCm}], measurementsEnabled, trainingDays:number[],
 *   goal, accountCreatedAt: 'YYYY-MM-DD', globalExerciseAverages?: Map<string, number> }
 */
export function computeSeasonRanking(params, seasonInfo) {
  const today = todayKey();
  const effectiveEnd = seasonInfo.endDate < today ? seasonInfo.endDate : today;

  const streakEvents = computeStreakEvents(
    params.sessions,
    params.trainingDays,
    params.accountCreatedAt,
    seasonInfo.startDate,
    effectiveEnd
  );
  const prEvents = computePRPoints(params.sets, params.sessions, seasonInfo.startDate, effectiveEnd);
  const nutritionEvents = computeNutritionEvents(
    params.nutritionEntries,
    params.bodyWeightEntries,
    params.goal,
    seasonInfo.startDate,
    effectiveEnd
  );
  const measurementEvents = params.measurementsEnabled
    ? computeMeasurementEvents(params.measurementEntries, params.goal, seasonInfo.startDate, effectiveEnd)
    : [];
  const performanceEvents = computePerformanceEvents(params.sets, params.globalExerciseAverages, effectiveEnd);

  const events = [...streakEvents, ...prEvents, ...nutritionEvents, ...measurementEvents, ...performanceEvents];
  const totalPoints = events.reduce((sum, e) => sum + e.points, 0);
  const state = tierFromPoints(totalPoints);

  return {
    seasonInfo,
    totalPoints: state.totalPoints,
    rank: state.rank,
    division: state.division,
  };
}
