import { describe, expect, it } from "vitest";
import { getSystemSceneDifferences } from "@spot-battle/shared";
import { GameMatch } from "../src/index.js";

function readyMatch(now = 1_000) {
  const match = new GameMatch("match", "prototype-room", [
    { playerId: "a", nickname: "가" },
    { playerId: "b", nickname: "나" },
  ]);
  match.markReady("a", now);
  match.markReady("b", now);
  return match;
}

describe("시스템 문제 실시간 1:1 경기", () => {
  it("이전 제작 단계의 저장 경기는 승패 없이 안전하게 취소한다", () => {
    const current = readyMatch().serialize();
    const restored = GameMatch.restore({ ...current, state: "EDITING" as never });
    expect(restored.snapshot("a")).toMatchObject({
      state: "CANCELLED",
      endReason: "CANCELLED",
      winnerId: null,
    });
  });

  it("양쪽 준비가 끝나면 제작 단계 없이 즉시 풀이를 시작한다", () => {
    const match = readyMatch();
    expect(match.currentState).toBe("FINDING");
    expect(match.snapshot("a").state).toBe("FINDING");
  });

  it("두 플레이어가 동일한 시스템 정답을 푼다", () => {
    const match = readyMatch();
    const first = getSystemSceneDifferences("prototype-room")[0]!;
    expect(match.guess("a", first.region, 2_000).differenceId).toBe(first.id);
    expect(match.guess("b", first.region, 2_100).differenceId).toBe(first.id);
  });

  it("좌우 어느 보드에서 전달된 같은 좌표든 정답이며 중복 점수는 없다", () => {
    const match = readyMatch();
    const first = getSystemSceneDifferences("prototype-room")[0]!;
    expect(match.guess("a", first.region, 2_000).correct).toBe(true);
    expect(match.guess("a", first.region, 2_100).correct).toBe(true);
    expect(match.snapshot("a").players[0].foundCount).toBe(1);
    expect(match.snapshot("a").players[0].wrongAnswerCount).toBe(0);
  });

  it("오류 영역 밖 클릭은 오답으로 기록한다", () => {
    const match = readyMatch();
    expect(match.guess("a", { x: 0.01, y: 0.99 }, 2_000).correct).toBe(false);
    expect(match.snapshot("a").players[0].wrongAnswerCount).toBe(1);
  });

  it("양쪽 풀이 종료 후 찾은 수와 완료 시각으로 승패를 정한다", () => {
    const match = readyMatch();
    const differences = getSystemSceneDifferences("prototype-room");
    for (const difference of differences) match.guess("a", difference.region, 2_000);
    expect(match.currentState).toBe("FINDING");
    for (const difference of differences) match.guess("b", difference.region, 3_000);
    expect(match.currentState).toBe("FINISHED");
    expect(match.snapshot("a").winnerId).toBe("a");
  });
});
