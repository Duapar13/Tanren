import { useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { computePlacementStatus, computeSeasonRanking } from '../utils/ranking';
import { toDateKey, todayKey } from '../utils/date';

/** Season ranking + placement status for the current user, computed locally (so it works offline). */
export function useRanking() {
  const { sessions, sets, nutritionEntries, bodyWeightEntries, measurementEntries, exercises } = useData();
  const { user } = useAuth();

  const rankingParams = useMemo(
    () => ({
      sessions,
      sets,
      nutritionEntries,
      bodyWeightEntries,
      measurementEntries,
      exercises,
      measurementsEnabled: user?.measurementsEnabled ?? false,
      trainingDays: user?.trainingDays ?? [],
      goal: user?.goal ?? ('maintain' as const),
      accountCreatedAt: user?.createdAt ? toDateKey(new Date(user.createdAt)) : todayKey(),
    }),
    [sessions, sets, nutritionEntries, bodyWeightEntries, measurementEntries, exercises, user]
  );

  const ranking = useMemo(() => computeSeasonRanking(rankingParams), [rankingParams]);
  const placement = useMemo(
    () => computePlacementStatus(rankingParams, ranking.seasonInfo),
    [rankingParams, ranking.seasonInfo]
  );

  return {
    rankingParams,
    ranking,
    placement,
    inPlacement: placement.applicable && placement.inPlacement,
  };
}
