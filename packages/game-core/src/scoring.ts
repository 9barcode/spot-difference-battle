import type { PlayerResult } from "@spot-battle/shared";

export function getRemainingTimeMs(
  deadlineMs: number,
  nowMs: number,
  wrongAnswerCount: number,
): number {
  void wrongAnswerCount;
  return Math.max(0, deadlineMs - nowMs);
}

export function determineWinner(
  first: PlayerResult,
  second: PlayerResult,
): string | null {
  if (first.foundCount !== second.foundCount) {
    return first.foundCount > second.foundCount ? first.playerId : second.playerId;
  }

  if (first.wrongAnswerCount !== second.wrongAnswerCount) {
    return first.wrongAnswerCount < second.wrongAnswerCount
      ? first.playerId
      : second.playerId;
  }

  if (first.lastCorrectAtMs !== second.lastCorrectAtMs) {
    if (first.lastCorrectAtMs === null) return second.playerId;
    if (second.lastCorrectAtMs === null) return first.playerId;
    return first.lastCorrectAtMs < second.lastCorrectAtMs
      ? first.playerId
      : second.playerId;
  }

  return null;
}
