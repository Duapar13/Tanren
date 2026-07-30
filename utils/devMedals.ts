import { RANKS, RankName, SeasonMedal, seasonInfoForNumber } from './ranking';

function randomInt(min: number, maxInclusive: number): number {
  return Math.floor(Math.random() * (maxInclusive - min + 1)) + min;
}

/**
 * A fake season medal for previewing what different rank combos look like — not derived
 * from any real data. filledCount months get a (monotonically non-decreasing) rank color,
 * the rest stay unlit, mirroring how a real in-progress medal reads.
 */
export function generateRandomMedal(): SeasonMedal {
  const seasonNumber = randomInt(1, 99);
  const filledCount = randomInt(0, 6);

  const segments: (RankName | null)[] = [];
  let rankIndex = randomInt(0, RANKS.length - 1);
  for (let i = 0; i < 6; i++) {
    if (i >= filledCount) {
      segments.push(null);
      continue;
    }
    if (i > 0 && Math.random() < 0.6) {
      rankIndex = Math.min(RANKS.length - 1, rankIndex + randomInt(0, 1));
    }
    segments.push(RANKS[rankIndex]);
  }

  const peakRank: RankName = filledCount > 0 ? (segments[filledCount - 1] as RankName) : RANKS[0];

  return {
    seasonInfo: seasonInfoForNumber(seasonNumber),
    isComplete: filledCount === 6,
    segments,
    peakRank,
  };
}

export function generateRandomMedals(count: number): SeasonMedal[] {
  return Array.from({ length: Math.max(0, Math.round(count)) }, generateRandomMedal);
}
