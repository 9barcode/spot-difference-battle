import type { AnswerRegion, NormalizedPoint } from "@spot-battle/shared";

function isNormalized(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 1;
}

function distance(a: NormalizedPoint, b: NormalizedPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function isPointInAnswerRegion(
  point: NormalizedPoint,
  region: AnswerRegion,
): boolean {
  if (!isNormalized(point.x) || !isNormalized(point.y)) return false;
  return distance(point, region) <= region.radius;
}
