import { describe, expect, it } from "vitest";
import type { Difference } from "@spot-battle/shared";
import { GameMatch, GameRuleError } from "../src/index.js";

const fallback: Difference[] = [
  { id: "a", kind: "ADD", region: { x: 0.2, y: 0.2, radius: 0.05 } },
  { id: "b", kind: "COVER", region: { x: 0.5, y: 0.5, radius: 0.05 } },
  { id: "c", kind: "COLOR", region: { x: 0.8, y: 0.8, radius: 0.05 } },
];

function createMatch(): GameMatch {
  return new GameMatch(
    "match-1",
    "image-1",
    [
      { playerId: "p1", nickname: "첫째" },
      { playerId: "p2", nickname: "둘째" },
    ],
    fallback,
  );
}

function startEditing(match: GameMatch, nowMs = 1_000): void {
  match.markReady("p1", nowMs);
  match.markReady("p2", nowMs);
}

function startFinding(match: GameMatch, nowMs = 2_000): void {
  startEditing(match, nowMs - 1_000);
  match.submitDifferences("p1", fallback, nowMs);
  match.submitDifferences("p2", fallback, nowMs);
}

describe("GameMatch lifecycle", () => {
  it("moves both players from ready to editing and finding", () => {
    const match = createMatch();
    expect(match.currentState).toBe("READY");

    match.markReady("p1", 1_000);
    expect(match.currentState).toBe("READY");
    match.markReady("p2", 1_000);
    expect(match.currentState).toBe("EDITING");

    match.submitDifferences("p1", fallback, 2_000);
    expect(match.currentState).toBe("EDITING");
    match.submitDifferences("p2", fallback, 2_000);
    expect(match.currentState).toBe("FINDING");
    expect(match.snapshot().players.every((player) => player.submitted)).toBe(true);
  });

  it("rejects actions that do not belong to the current state", () => {
    const match = createMatch();
    expect(() => match.submitDifferences("p1", fallback, 1_000)).toThrowError(GameRuleError);

    try {
      match.submitDifferences("p1", fallback, 1_000);
    } catch (error) {
      expect(error).toMatchObject({ code: "INVALID_STATE" });
    }
  });

  it("ends without injecting fallback differences when editing expires", () => {
    const match = createMatch();
    startEditing(match, 1_000);

    expect(match.expire(31_000)).toBe(true);
    expect(match.snapshot()).toMatchObject({
      state: "FINISHED",
      winnerId: null,
      endReason: "TIMEOUT",
    });
    expect(match.snapshot().players.every((player) => !player.submitted)).toBe(true);
  });

  it("awards an editing-timeout win to the player who submitted", () => {
    const match = createMatch();
    startEditing(match, 1_000);
    match.submitDifferences("p1", fallback, 2_000);

    expect(match.expire(31_000)).toBe(true);
    expect(match.snapshot()).toMatchObject({
      state: "FINISHED",
      winnerId: "p1",
      endReason: "TIMEOUT",
    });
  });

  it("tracks correct, duplicate and wrong guesses with server time", () => {
    const match = createMatch();
    startFinding(match);

    expect(match.guess("p1", { x: 0.2, y: 0.2 }, 3_000)).toMatchObject({
      correct: true,
      differenceId: "a",
      remainingTimeMs: 59_000,
    });
    expect(match.guess("p1", { x: 0.2, y: 0.2 }, 4_000)).toMatchObject({
      correct: false,
      differenceId: null,
      remainingTimeMs: 55_000,
    });
    expect(match.snapshot().players[0]).toMatchObject({ foundCount: 1, wrongAnswerCount: 1 });
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

  it("finishes when wrong-answer penalties consume all remaining time", () => {
    const match = createMatch();
    startFinding(match, 2_000);

    for (let index = 0; index < 20; index += 1) {
      match.guess("p1", { x: 0.01, y: 0.99 }, 2_000);
    }

    expect(match.snapshot()).toMatchObject({ state: "FINISHED", winnerId: "p2" });
  });

  it("tracks reconnecting players and restores their connection", () => {
    const match = createMatch();
    match.setConnectionStatus("p1", "RECONNECTING");
    expect(match.snapshot().players[0]?.connectionStatus).toBe("RECONNECTING");

    match.setConnectionStatus("p1", "CONNECTED");
    expect(match.snapshot().players[0]?.connectionStatus).toBe("CONNECTED");
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
