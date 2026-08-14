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
export const DIVISIONS = ['V', 'IV', 'III', 'II', 'I'];
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
const SEASON_EPOCH_QUARTER = 3;
const SEASON_EPOCH_QUARTER_INDEX = SEASON_EPOCH_YEAR * 4 + (SEASON_EPOCH_QUARTER - 1);

function seasonInfoForQuarterIndex(quarterIndex) {
  const year = Math.floor(quarterIndex / 4);
  const quarter = (quarterIndex % 4) + 1;
  const seasonNumber = quarterIndex - SEASON_EPOCH_QUARTER_INDEX + 1;
  const startMonth = (quarter - 1) * 3;
  const start = new Date(year, startMonth, 1);
  const end = new Date(year, startMonth + 3, 0);
  return { seasonNumber, quarter, year, startDate: toDateKey(start), endDate: toDateKey(end) };
}

export function seasonInfoForNumber(seasonNumber) {
  return seasonInfoForQuarterIndex(seasonNumber - 1 + SEASON_EPOCH_QUARTER_INDEX);
}

function quarterIndexForDate(date) {
  const year = date.getFullYear();
  const quarter = Math.floor(date.getMonth() / 3) + 1;
  return year * 4 + (quarter - 1);
}

export function currentSeasonInfo(date = new Date()) {
  return seasonInfoForQuarterIndex(quarterIndexForDate(date));
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

// Mirrors utils/ranking.ts's FREQUENCY_BONUS_* — rewards training more than your scheduled
// program, on top of the streak points for not missing it. Keep both copies in sync.
const FREQUENCY_BONUS_BASELINE_PER_WEEK = 2;
const FREQUENCY_BONUS_PER_EXTRA_SESSION = 8;

function mondayOfWeek(d) {
  const daysSinceMonday = (d.getDay() + 6) % 7;
  return toDateKey(addDays(d, -daysSinceMonday));
}

function computeFrequencyEvents(sessions, rangeStart, rangeEnd) {
  const datesByWeek = new Map();
  for (const s of sessions) {
    if (s.date < rangeStart || s.date > rangeEnd) continue;
    const weekStart = mondayOfWeek(new Date(`${s.date}T00:00:00`));
    if (!datesByWeek.has(weekStart)) datesByWeek.set(weekStart, new Set());
    datesByWeek.get(weekStart).add(s.date);
  }

  const events = [];
  for (const [weekStart, dates] of datesByWeek) {
    const extra = dates.size - FREQUENCY_BONUS_BASELINE_PER_WEEK;
    if (extra <= 0) continue;
    const weekEnd = toDateKey(addDays(new Date(`${weekStart}T00:00:00`), 6));
    events.push({
      date: weekEnd < rangeEnd ? weekEnd : rangeEnd,
      points: extra * FREQUENCY_BONUS_PER_EXTRA_SESSION,
      source: 'frequency',
    });
  }
  return events;
}

// Mirrors utils/ranking.ts's SEASON_CARRYOVER_* + computeCarryoverEvent/computeSeasonMedal's
// peak tracking. Only the peak rank is needed here (not the per-month medal segments), since
// the server has no use for the visual medal — just the carryover bonus it feeds into.
const SEASON_CARRYOVER_RATIO = 0.5;
const SEASON_CARRYOVER_MIN_SESSIONS = 10;

function eventsForRange(params, rangeStart, rangeEnd) {
  const streakEvents = computeStreakEvents(params.sessions, params.trainingDays, params.accountCreatedAt, rangeStart, rangeEnd);
  const prEvents = computePRPoints(params.sets, params.sessions, rangeStart, rangeEnd);
  const nutritionEvents = computeNutritionEvents(params.nutritionEntries, params.bodyWeightEntries, params.goal, rangeStart, rangeEnd);
  const measurementEvents = params.measurementsEnabled
    ? computeMeasurementEvents(params.measurementEntries, params.goal, rangeStart, rangeEnd)
    : [];
  const frequencyEvents = computeFrequencyEvents(params.sessions, rangeStart, rangeEnd);
  return [...streakEvents, ...prEvents, ...nutritionEvents, ...measurementEvents, ...frequencyEvents];
}

function peakRankForSeason(params, seasonInfo, effectiveEnd) {
  const events = eventsForRange(params, seasonInfo.startDate, effectiveEnd);
  const pointsByDate = new Map();
  for (const e of events) pointsByDate.set(e.date, (pointsByDate.get(e.date) ?? 0) + e.points);

  let cumulative = 0;
  let runningMax = 0;
  let cursor = new Date(`${seasonInfo.startDate}T00:00:00`);
  let cursorKey = toDateKey(cursor);
  while (cursorKey <= effectiveEnd) {
    cumulative += pointsByDate.get(cursorKey) ?? 0;
    runningMax = Math.max(runningMax, cumulative);
    cursor = addDays(cursor, 1);
    cursorKey = toDateKey(cursor);
  }
  return tierFromPoints(runningMax).rank;
}

function computeCarryoverEvent(params, seasonInfo, effectiveEnd) {
  if (seasonInfo.seasonNumber <= 1) return null;

  const sessionsInSeason = params.sessions
    .filter((s) => s.date >= seasonInfo.startDate && s.date <= effectiveEnd)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  if (sessionsInSeason.length < SEASON_CARRYOVER_MIN_SESSIONS) return null;

  const previousSeasonInfo = seasonInfoForNumber(seasonInfo.seasonNumber - 1);
  const today = todayKey();
  const previousEffectiveEnd = previousSeasonInfo.endDate < today ? previousSeasonInfo.endDate : today;
  const peakRank = peakRankForSeason(params, previousSeasonInfo, previousEffectiveEnd);
  const peakIndex = RANKS.indexOf(peakRank);
  if (peakIndex <= 0) return null;

  const bonus = Math.round(peakIndex * DIVISIONS.length * POINTS_PER_DIVISION * SEASON_CARRYOVER_RATIO);
  if (bonus <= 0) return null;

  const triggerDate = sessionsInSeason[SEASON_CARRYOVER_MIN_SESSIONS - 1].date;
  return { date: triggerDate, points: bonus, source: 'carryover' };
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
  const frequencyEvents = computeFrequencyEvents(params.sessions, seasonInfo.startDate, effectiveEnd);
  const carryoverEvent = computeCarryoverEvent(params, seasonInfo, effectiveEnd);

  const events = [
    ...streakEvents,
    ...prEvents,
    ...nutritionEvents,
    ...measurementEvents,
    ...performanceEvents,
    ...frequencyEvents,
    ...(carryoverEvent ? [carryoverEvent] : []),
  ];
  const totalPoints = events.reduce((sum, e) => sum + e.points, 0);
  const state = tierFromPoints(totalPoints);

  return {
    seasonInfo,
    totalPoints: state.totalPoints,
    rank: state.rank,
    division: state.division,
  };
}
