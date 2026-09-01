import {
  type AnswerRegion,
  type NormalizedPoint,
} from "@spot-battle/shared";

function isNormalized(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 1;
}

function distance(a: NormalizedPoint, b: NormalizedPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function isPointInAnswerRegion(point: NormalizedPoint, region: AnswerRegion): boolean {
  if (!isNormalized(point.x) || !isNormalized(point.y)) return false;
  return distance(point, region) <= region.radius;
}

export function getRemainingTimeMs(
  deadlineMs: number,
  nowMs: number,
  wrongAnswerCount: number,
): number {
  void wrongAnswerCount;
  return Math.max(0, deadlineMs - nowMs);
}

export {
  GameMatch,
  GameRuleError,
  type MatchPlayer,
  type MatchPuzzle,
  type PuzzleDifference,
  type PersistedMatchPlayer,
  type PersistedMatchState,
} from "./match.js";
