import type { NormalizedPoint } from "@spot-battle/shared";

export const SOLO_DIFFERENCE_COUNT = 5;
export const SOLO_WRONG_PENALTY_MS = 3_000;
export const SOLO_TOUCH_TARGET_RADIUS_PX = 24;

export interface SoloDifference {
  id: string;
  label: string;
  region: NormalizedPoint & { radius: number };
}

export function findSoloDifference(
  differences: readonly SoloDifference[],
  foundIds: ReadonlySet<string>,
  point: NormalizedPoint,
  minimumHitRadius = 0,
): SoloDifference | null {
  return differences
    .filter((difference) => !foundIds.has(difference.id))
    .map((difference) => {
      const deltaX = point.x - difference.region.x;
      const deltaY = point.y - difference.region.y;
      return { difference, distanceSquared: (deltaX * deltaX) + (deltaY * deltaY) };
    })
    .filter(({ difference, distanceSquared }) => {
      const hitRadius = Math.max(difference.region.radius, minimumHitRadius);
      return distanceSquared <= hitRadius ** 2;
    })
    .sort((left, right) => left.distanceSquared - right.distanceSquared)[0]?.difference ?? null;
}

export function minimumSoloHitRadius(pointerType: string, boardSizePx: number): number {
  if (pointerType !== "touch" || boardSizePx <= 0) return 0;
  return Math.min(0.08, SOLO_TOUCH_TARGET_RADIUS_PX / boardSizePx);
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
