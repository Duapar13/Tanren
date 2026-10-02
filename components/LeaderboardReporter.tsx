import { useCallback, useEffect, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useRanking } from '../hooks/useRanking';
import { apiFetch } from '../lib/api';

const MIN_INTERVAL_MS = 60_000;

/** Headless: asks the server to recompute this user's leaderboard score. The server derives the
 * real numbers from synced data and ignores anything the client sends — this is only the trigger.
 * It runs from the tab shell (not just the Rank screen) so the score stays fresh wherever the
 * user is, and re-fires when connectivity returns after an offline stretch. */
export function LeaderboardReporter() {
  const { ranking } = useRanking();
  const seasonNumber = ranking.seasonInfo.seasonNumber;
  const lastReport = useRef<{ key: string; at: number } | null>(null);

  const report = useCallback(
    (force: boolean) => {
      const key = `${seasonNumber}:${ranking.totalPoints}:${ranking.state.rank}:${ranking.state.division}`;
      const last = lastReport.current;
      if (!force && last && last.key === key && Date.now() - last.at < MIN_INTERVAL_MS) return;
      lastReport.current = { key, at: Date.now() };
      apiFetch('/leaderboard/report', {
        method: 'POST',
        body: JSON.stringify({ seasonNumber }),
      }).catch(() => {
        // Offline: forget this attempt so the reconnect trigger below isn't throttled away.
        lastReport.current = null;
      });
    },
    [seasonNumber, ranking.totalPoints, ranking.state.rank, ranking.state.division]
  );

  useEffect(() => {
    report(false);
  }, [report]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected) report(false);
    });
    return () => unsubscribe();
  }, [report]);

  return null;
}
