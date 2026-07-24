import { describe, expect, it } from "vitest";
import type { Difference } from "@spot-battle/shared";
import { GameMatch, GameRuleError } from "../src/index.js";

const differences: Difference[] = [
  { id: "a", kind: "COLOR", region: { x: 0.2, y: 0.2, radius: 0.05 } },
  { id: "b", kind: "DRAW", region: { x: 0.5, y: 0.5, radius: 0.05 } },
  { id: "c", kind: "COLOR", region: { x: 0.8, y: 0.8, radius: 0.05 } },
];

const IMAGE = `data:image/png;base64,${"A".repeat(512)}`;

function createMatch(): GameMatch {
  return new GameMatch("match-1", "image-1", [
    { playerId: "creator", nickname: "제작자" },
    { playerId: "finder", nickname: "찾는사람" },
  ]);
}

function startEditing(match: GameMatch, nowMs = 1_000): void {
  match.markReady("creator", nowMs);
  match.markReady("finder", nowMs);
}

function startFinding(match: GameMatch, nowMs = 2_000): void {
  startEditing(match, nowMs - 1_000);
  match.submitDifferences("creator", differences, IMAGE, nowMs);
}

describe("GameMatch asymmetric creator/finder lifecycle", () => {
  it("starts finding as soon as the creator presses complete", () => {
    const match = createMatch();
    startEditing(match);
    expect(match.currentState).toBe("EDITING");

    match.submitDifferences("creator", differences, IMAGE, 2_000);
    expect(match.currentState).toBe("FINDING");
    expect(match.snapshot().players[0]).toMatchObject({ submitted: true });
    expect(match.snapshot().players[1]).toMatchObject({ submitted: false });
  });

  it("does not allow the finder to submit or the creator to guess", () => {
    const match = createMatch();
    startEditing(match);
    expect(() => match.submitDifferences("finder", differences, IMAGE, 2_000)).toThrowError(GameRuleError);

    match.submitDifferences("creator", differences, IMAGE, 2_000);
    expect(() => match.guess("creator", { x: 0.2, y: 0.2 }, 3_000)).toThrowError(GameRuleError);
    expect(() => match.useHint("creator", 3_000)).toThrowError(GameRuleError);
  });

  it("awards the finder a forfeit win when the creator misses the editing deadline", () => {
    const match = createMatch();
    startEditing(match, 1_000);
    expect(match.expire(31_000)).toBe(true);
    expect(match.snapshot()).toMatchObject({
      state: "FINISHED",
      winnerId: "finder",
      endReason: "FORFEIT",
    });
  });

  it("allows only the finder to locate differences", () => {
    const match = createMatch();
    startFinding(match);
    expect(match.guess("finder", { x: 0.2, y: 0.2 }, 3_000)).toMatchObject({
      correct: true,
      differenceId: "a",
      remainingTimeMs: 59_000,
    });
    expect(match.snapshot().players[1]).toMatchObject({ foundCount: 1 });
    expect(match.snapshot().players[0]).toMatchObject({ foundCount: 0 });
  });

  it("does not penalize selecting an already found difference", () => {
    const match = createMatch();
    startFinding(match);
    match.guess("finder", { x: 0.2, y: 0.2 }, 3_000);
    const version = match.version;
    match.guess("finder", { x: 0.2, y: 0.2 }, 4_000);
    expect(match.version).toBe(version);
    expect(match.snapshot().players[1]).toMatchObject({ foundCount: 1, wrongAnswerCount: 0 });
  });

  it("applies a three-second penalty and supports one hint", () => {
    const match = createMatch();
    startFinding(match);
    expect(match.guess("finder", { x: 0.05, y: 0.95 }, 3_000)).toMatchObject({
      correct: false,
      remainingTimeMs: 56_000,
    });
    expect(match.useHint("finder", 4_000)).toMatchObject({ remaining: 0 });
    expect(() => match.useHint("finder", 5_000)).toThrowError(GameRuleError);
  });

  it("finishes with the finder as winner after all three are found", () => {
    const match = createMatch();
    startFinding(match);
    match.guess("finder", { x: 0.2, y: 0.2 }, 3_000);
    match.guess("finder", { x: 0.5, y: 0.5 }, 4_000);
    match.guess("finder", { x: 0.8, y: 0.8 }, 5_000);
    expect(match.snapshot()).toMatchObject({ state: "FINISHED", winnerId: "finder", endReason: "COMPLETED" });
  });

  it("awards the creator a win when finding time expires", () => {
    const match = createMatch();
    startFinding(match, 2_000);
    match.guess("finder", { x: 0.2, y: 0.2 }, 3_000);
    expect(match.expire(62_000)).toBe(true);
    expect(match.snapshot()).toMatchObject({ state: "FINISHED", winnerId: "creator", endReason: "TIMEOUT" });
  });

  it("keeps the creator's draft and answer coordinates hidden during editing", () => {
    const match = createMatch();
    startEditing(match);
    const finderSnapshot = match.snapshot("finder");
    expect(finderSnapshot.problemImage).toBeNull();
    expect(finderSnapshot.revealedDifferences).toBeNull();
    expect(JSON.stringify(finderSnapshot)).not.toContain('"radius"');
  });

  it("sends only the rendered image to the finder during finding", () => {
    const match = createMatch();
    startFinding(match);
    const snapshot = match.snapshot("finder");
    expect(snapshot.problemImage).toBe(IMAGE);
    expect(snapshot.revealedDifferences).toBeNull();
    expect(snapshot.foundMarks).toEqual([]);
    const serialized = JSON.stringify(snapshot);
    expect(serialized).not.toContain("strokes");
    expect(serialized).not.toContain("fill");
    expect(serialized).not.toContain("objectEdit");
    expect(serialized).not.toContain('"a"');
  });

  it("returns coordinates only after the finder has found a difference", () => {
    const match = createMatch();
    startFinding(match);
    match.guess("finder", { x: 0.2, y: 0.2 }, 3_000);
    expect(match.snapshot("finder").foundMarks).toEqual([
      { differenceId: "a", region: differences[0]!.region },
    ]);
  });

  it("reveals all answers after finish with finder status for both viewers", () => {
    const match = createMatch();
    startFinding(match);
    match.guess("finder", { x: 0.2, y: 0.2 }, 3_000);
    match.expire(62_000);
    expect(match.snapshot("finder").revealedDifferences).toEqual([
      { id: "a", kind: "COLOR", region: differences[0]!.region, found: true },
      { id: "b", kind: "DRAW", region: differences[1]!.region, found: false },
      { id: "c", kind: "COLOR", region: differences[2]!.region, found: false },
    ]);
    expect(match.snapshot("creator").revealedDifferences).toEqual(match.snapshot("finder").revealedDifferences);
  });

  it("restores the active creator/finder match", () => {
    const match = createMatch();
    startFinding(match);
    match.guess("finder", { x: 0.2, y: 0.2 }, 3_000);
    match.useHint("finder", 3_500);
    const state = match.serialize();
    const restored = GameMatch.restore(state);
    expect(restored.serialize()).toEqual(state);
    expect(restored.snapshot("finder")).toMatchObject({
      state: "FINDING",
      problemImage: IMAGE,
      myFoundIds: ["a"],
      foundMarks: [{ differenceId: "a", region: differences[0]!.region }],
    });
  });

  it("awards a forfeit win to the other role", () => {
    const match = createMatch();
    startEditing(match);
    match.forfeit("creator");
    expect(match.snapshot()).toMatchObject({ state: "FINISHED", winnerId: "finder", endReason: "FORFEIT" });
  });
});
