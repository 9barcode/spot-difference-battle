import type { NormalizedPoint } from "@spot-battle/shared";

export const SOLO_DIFFERENCE_COUNT = 5;
export const SOLO_WRONG_PENALTY_MS = 3_000;

export interface SoloDifference {
  id: string;
  label: string;
  region: NormalizedPoint & { radius: number };
}

export function findSoloDifference(
  differences: readonly SoloDifference[],
  foundIds: ReadonlySet<string>,
  point: NormalizedPoint,
): SoloDifference | null {
  return differences.find((difference) => {
    if (foundIds.has(difference.id)) return false;
    const deltaX = point.x - difference.region.x;
    const deltaY = point.y - difference.region.y;
    return (deltaX * deltaX) + (deltaY * deltaY) <= difference.region.radius ** 2;
  }) ?? null;
}

export function soloElapsedMs(
  startedAtMs: number,
  finishedAtMs: number,
  wrongAnswerCount: number,
): number {
  return Math.max(0, finishedAtMs - startedAtMs)
    + (wrongAnswerCount * SOLO_WRONG_PENALTY_MS);
}

export function bestSoloTime(
  previousBestMs: number | null | undefined,
  elapsedMs: number,
): number {
  return previousBestMs === null || previousBestMs === undefined
    ? elapsedMs
    : Math.min(previousBestMs, elapsedMs);
}

export function formatSoloTime(elapsedMs: number): string {
  return `${(elapsedMs / 1_000).toFixed(2)}초`;
}
