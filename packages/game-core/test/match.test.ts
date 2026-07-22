import { describe, expect, it } from "vitest";
import type { Difference } from "@spot-battle/shared";
import { GameMatch, GameRuleError } from "../src/index.js";

const fallback: Difference[] = [
  { id: "a", kind: "ADD", region: { x: 0.2, y: 0.2, radius: 0.05 } },
  { id: "b", kind: "COVER", region: { x: 0.5, y: 0.5, radius: 0.05 } },
  { id: "c", kind: "COLOR", region: { x: 0.8, y: 0.8, radius: 0.05 } },
];

/** 제작자가 렌더해 올리는 문제 이미지 대역. 서버는 형식과 용량만 검증한다. */
const IMAGE = `data:image/webp;base64,${"A".repeat(512)}`;

function createMatch(): GameMatch {
  return new GameMatch("match-1", "image-1", [
    { playerId: "p1", nickname: "첫째" },
    { playerId: "p2", nickname: "둘째" },
  ]);
}

function startEditing(match: GameMatch, nowMs = 1_000): void {
  match.markReady("p1", nowMs);
  match.markReady("p2", nowMs);
}

function startFinding(match: GameMatch, nowMs = 2_000): void {
  startEditing(match, nowMs - 1_000);
  match.submitDifferences("p1", fallback, IMAGE, nowMs);
  match.submitDifferences("p2", fallback, IMAGE, nowMs);
}

describe("GameMatch lifecycle", () => {
  it("moves both players from ready to editing and finding", () => {
    const match = createMatch();
    expect(match.currentState).toBe("READY");

    match.markReady("p1", 1_000);
    expect(match.currentState).toBe("READY");
    match.markReady("p2", 1_000);
    expect(match.currentState).toBe("EDITING");

    match.submitDifferences("p1", fallback, IMAGE, 2_000);
    expect(match.currentState).toBe("EDITING");
    match.submitDifferences("p2", fallback, IMAGE, 2_000);
    expect(match.currentState).toBe("FINDING");
    expect(match.snapshot().players.every((player) => player.submitted)).toBe(true);
  });

  it("rejects actions that do not belong to the current state", () => {
    const match = createMatch();
    expect(() => match.submitDifferences("p1", fallback, IMAGE, 1_000)).toThrowError(GameRuleError);

    try {
      match.submitDifferences("p1", fallback, IMAGE, 1_000);
    } catch (error) {
      expect(error).toMatchObject({ code: "INVALID_STATE" });
    }
  });

  it("cancels the match when neither player submits before the editing deadline", () => {
    const match = createMatch();
    startEditing(match, 1_000);

    expect(match.expire(31_000)).toBe(true);
    expect(match.snapshot()).toMatchObject({
      state: "CANCELLED",
      winnerId: null,
      endReason: "CANCELLED",
    });
    expect(match.snapshot().players.every((player) => !player.submitted)).toBe(true);
  });

  it("forfeits the player who never submitted before the editing deadline", () => {
    const match = createMatch();
    startEditing(match, 1_000);
    match.submitDifferences("p1", fallback, IMAGE, 2_000);

    expect(match.expire(31_000)).toBe(true);
    expect(match.snapshot()).toMatchObject({
      state: "FINISHED",
      winnerId: "p1",
      endReason: "FORFEIT",
    });
    expect(match.snapshot().players[1]?.connectionStatus).toBe("FORFEITED");
  });

  it("does not penalize a player for selecting an already found difference", () => {
    const match = createMatch();
    startFinding(match);

    expect(match.guess("p1", { x: 0.2, y: 0.2 }, 3_000)).toMatchObject({
      correct: true,
      differenceId: "a",
      remainingTimeMs: 59_000,
    });
    const versionAfterFirstGuess = match.version;

    expect(match.guess("p1", { x: 0.2, y: 0.2 }, 4_000)).toMatchObject({
      correct: true,
      differenceId: "a",
      remainingTimeMs: 58_000,
    });
    expect(match.version).toBe(versionAfterFirstGuess);
    expect(match.snapshot().players[0]).toMatchObject({ foundCount: 1, wrongAnswerCount: 0 });
  });

  it("applies another three-second penalty for every wrong guess and still allows a hint", () => {
    const match = createMatch();
    startFinding(match);

    expect(match.guess("p1", { x: 0.05, y: 0.95 }, 3_000)).toMatchObject({
      correct: false,
      remainingTimeMs: 56_000,
    });
    expect(match.guess("p1", { x: 0.1, y: 0.9 }, 4_000)).toMatchObject({
      correct: false,
      remainingTimeMs: 52_000,
    });
    expect(match.snapshot().players[0]).toMatchObject({ wrongAnswerCount: 2 });
    expect(match.useHint("p1", 5_000)).toMatchObject({ remaining: 0 });
  });

  it("limits hints and returns a wider surrounding area", () => {
    const match = createMatch();
    startFinding(match);

    const hint = match.useHint("p1", 3_000);
    expect(hint.remaining).toBe(0);
    expect(hint.area.radius).toBeGreaterThan(fallback[0]!.region.radius);
    expect(() => match.useHint("p1", 4_000)).toThrowError(GameRuleError);
  });

  it("finishes immediately when a player finds all differences", () => {
    const match = createMatch();
    startFinding(match);

    match.guess("p1", { x: 0.2, y: 0.2 }, 3_000);
    match.guess("p1", { x: 0.5, y: 0.5 }, 4_000);
    match.guess("p1", { x: 0.8, y: 0.8 }, 5_000);

    expect(match.currentState).toBe("FINISHED");
    expect(match.snapshot().winnerId).toBe("p1");
    expect(() => match.guess("p2", { x: 0.2, y: 0.2 }, 6_000)).toThrowError(GameRuleError);
  });

  it("uses score rules when finding time expires", () => {
    const match = createMatch();
    startFinding(match, 2_000);
    match.guess("p2", { x: 0.2, y: 0.2 }, 3_000);

    expect(match.expire(62_000)).toBe(true);
    expect(match.snapshot()).toMatchObject({ state: "FINISHED", winnerId: "p2" });
  });

  it("keeps the match running for the opponent when one player loses all time to penalties", () => {
    const match = createMatch();
    startFinding(match, 2_000);

    for (let index = 0; index < 20; index += 1) {
      match.guess("p1", { x: 0.01, y: 0.99 }, 2_000);
    }

    expect(match.snapshot()).toMatchObject({ state: "FINDING", winnerId: null });
    expect(() => match.guess("p1", { x: 0.2, y: 0.2 }, 2_000)).toThrowError(GameRuleError);
    expect(match.currentState).toBe("FINDING");

    match.guess("p2", { x: 0.2, y: 0.2 }, 3_000);
    match.guess("p2", { x: 0.5, y: 0.5 }, 4_000);
    match.guess("p2", { x: 0.8, y: 0.8 }, 5_000);

    expect(match.snapshot()).toMatchObject({
      state: "FINISHED",
      winnerId: "p2",
      endReason: "COMPLETED",
    });
  });

  it("tracks reconnecting players and restores their connection", () => {
    const match = createMatch();
    match.setConnectionStatus("p1", "RECONNECTING");
    expect(match.snapshot().players[0]?.connectionStatus).toBe("RECONNECTING");

    match.setConnectionStatus("p1", "CONNECTED");
    expect(match.snapshot().players[0]?.connectionStatus).toBe("CONNECTED");
  });

  it("never leaks unfound answer coordinates to the solving player", () => {
    const match = createMatch();
    startFinding(match);

    const snapshot = match.snapshot("p1");
    // 풀이 중에 나가는 것은 렌더된 이미지 한 장뿐이어야 한다.
    expect(snapshot.problemImage).toBe(IMAGE);
    expect(snapshot.revealedDifferences).toBeNull();
    expect(snapshot.foundMarks).toEqual([]);

    // 직렬화한 전체 payload 어디에도 정답 좌표가 남아 있으면 안 된다.
    const serialized = JSON.stringify(snapshot);
    expect(serialized).not.toContain("radius");
    expect(serialized).not.toContain("strokes");
    expect(serialized).not.toContain("fill");
    for (const difference of fallback) {
      expect(serialized).not.toContain(`"${difference.id}"`);
    }
  });

  it("returns the position only for differences the player already found", () => {
    const match = createMatch();
    startFinding(match);

    const result = match.guess("p1", { x: 0.2, y: 0.2 }, 3_000);
    expect(result).toMatchObject({ correct: true, region: { x: 0.2, y: 0.2 } });

    const snapshot = match.snapshot("p1");
    expect(snapshot.foundMarks).toEqual([
      { differenceId: "a", region: { x: 0.2, y: 0.2, radius: 0.05 } },
    ]);
    // 아직 못 찾은 b, c는 여전히 숨어 있어야 한다.
    const serialized = JSON.stringify(snapshot);
    expect(serialized).not.toContain('"b"');
    expect(serialized).not.toContain('"c"');
  });

  it("returns no position for a wrong guess", () => {
    const match = createMatch();
    startFinding(match);

    expect(match.guess("p1", { x: 0.05, y: 0.95 }, 3_000)).toMatchObject({
      correct: false,
      region: null,
    });
  });

  it("reveals every difference only after the match is finished", () => {
    const match = createMatch();
    startFinding(match);

    match.guess("p1", { x: 0.2, y: 0.2 }, 3_000);
    expect(match.snapshot("p1").revealedDifferences).toBeNull();

    match.guess("p1", { x: 0.5, y: 0.5 }, 4_000);
    match.guess("p1", { x: 0.8, y: 0.8 }, 5_000);
    expect(match.currentState).toBe("FINISHED");

    expect(match.snapshot("p1").revealedDifferences).toEqual([
      { id: "a", kind: "ADD", region: { x: 0.2, y: 0.2, radius: 0.05 }, found: true },
      { id: "b", kind: "COVER", region: { x: 0.5, y: 0.5, radius: 0.05 }, found: true },
      { id: "c", kind: "COLOR", region: { x: 0.8, y: 0.8, radius: 0.05 }, found: true },
    ]);
    // 못 찾은 쪽에게도 전체가 공개되고, 무엇을 놓쳤는지 구분된다.
    expect(match.snapshot("p2").revealedDifferences?.every((item) => !item.found)).toBe(true);
  });

  it("rejects a submission without a valid problem image", () => {
    const match = createMatch();
    startEditing(match, 1_000);

    expect(() => match.submitDifferences("p1", fallback, "", 2_000)).toThrowError(GameRuleError);
    expect(() =>
      match.submitDifferences("p1", fallback, "https://example.com/problem.png", 2_000),
    ).toThrowError(GameRuleError);

    try {
      match.submitDifferences("p1", fallback, `data:image/webp;base64,${"A".repeat(8_000_000)}`, 2_000);
    } catch (error) {
      expect(error).toMatchObject({ code: "INVALID_PROBLEM_IMAGE" });
    }

    // 거절된 뒤에도 정상 제출은 그대로 받아들여야 한다.
    match.submitDifferences("p1", fallback, IMAGE, 2_000);
    expect(match.snapshot().players[0]?.submitted).toBe(true);
  });

  it("marks an auto-filled submission so the UI can explain it", () => {
    const match = createMatch();
    startEditing(match, 1_000);

    match.submitDifferences("p1", fallback, IMAGE, 2_000, true);
    expect(match.snapshot().players[0]).toMatchObject({ submitted: true, autoFilled: true });
    match.submitDifferences("p2", fallback, IMAGE, 2_000);
    expect(match.snapshot().players[1]).toMatchObject({ submitted: true, autoFilled: false });
  });

  it("awards a forfeit win to the opponent", () => {
    const match = createMatch();
    startEditing(match);
    match.forfeit("p1");

    expect(match.snapshot()).toMatchObject({
      state: "FINISHED",
      winnerId: "p2",
      endReason: "FORFEIT",
    });
    expect(match.snapshot().players[0]?.connectionStatus).toBe("FORFEITED");
  });
});
