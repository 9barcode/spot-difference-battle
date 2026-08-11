import { describe, expect, it } from "vitest";
import type { Difference } from "@spot-battle/shared";
import { GameMatch } from "../src/index.js";

const image = "data:image/png;base64,iVBORw0KGgo=";
const makeDifferences = (prefix: string): Difference[] => [
  { id: `${prefix}-1`, kind: "COLOR", region: { x: 0.2, y: 0.2, radius: 0.04 } },
  { id: `${prefix}-2`, kind: "COLOR", region: { x: 0.5, y: 0.5, radius: 0.04 } },
  { id: `${prefix}-3`, kind: "COLOR", region: { x: 0.8, y: 0.8, radius: 0.04 } },
];

function editingMatch(now = 1_000) {
  const match = new GameMatch("match", "prototype-room", [
    { playerId: "a", nickname: "가" },
    { playerId: "b", nickname: "나" },
  ]);
  match.markReady("a", now);
  match.markReady("b", now);
  return match;
}

describe("상호 제작·풀이 경기", () => {
  it("양쪽 제출 전에는 풀이를 시작하지 않고 상대 문제만 전달한다", () => {
    const match = editingMatch();
    match.submitDifferences("a", makeDifferences("a"), image + "YQ==", 2_000);
    expect(match.currentState).toBe("EDITING");
    expect(match.snapshot("b").problemImage).toBeNull();

    match.submitDifferences("b", makeDifferences("b"), image + "Yg==", 2_100);
    expect(match.currentState).toBe("FINDING");
    expect(match.snapshot("a").problemImage).toBe(image + "Yg==");
    expect(match.snapshot("b").problemImage).toBe(image + "YQ==");
  });

  it("각 플레이어가 상대가 만든 정답을 푼다", () => {
    const match = editingMatch();
    match.submitDifferences("a", makeDifferences("a"), image + "YQ==", 2_000);
    match.submitDifferences("b", makeDifferences("b"), image + "Yg==", 2_100);

    expect(match.guess("a", { x: 0.2, y: 0.2 }, 3_000).differenceId).toBe("b-1");
    expect(match.guess("b", { x: 0.2, y: 0.2 }, 3_100).differenceId).toBe("a-1");
  });

  it("한 명이 먼저 완료해도 기다리고 양쪽 완료 후 결과를 비교한다", () => {
    const match = editingMatch();
    match.submitDifferences("a", makeDifferences("a"), image, 2_000);
    match.submitDifferences("b", makeDifferences("b"), image, 2_100);
    for (const point of [{ x: 0.2, y: 0.2 }, { x: 0.5, y: 0.5 }, { x: 0.8, y: 0.8 }]) match.guess("a", point, 3_000);
    expect(match.currentState).toBe("FINDING");
    expect(() => match.guess("a", { x: 0.1, y: 0.1 }, 3_500)).toThrow("이미 모든 차이점을 찾았습니다.");
    for (const point of [{ x: 0.2, y: 0.2 }, { x: 0.5, y: 0.5 }, { x: 0.8, y: 0.8 }]) match.guess("b", point, 4_000);
    expect(match.currentState).toBe("FINISHED");
    expect(match.snapshot("a").winnerId).toBe("a");
  });

  it("제작 마감에 한쪽만 미제출이면 제출한 플레이어가 기권승한다", () => {
    const match = editingMatch();
    match.submitDifferences("a", makeDifferences("a"), image, 2_000);
    expect(match.expire(31_001)).toBe(true);
    expect(match.snapshot("a").winnerId).toBe("a");
    expect(match.snapshot("a").endReason).toBe("FORFEIT");
  });
});
