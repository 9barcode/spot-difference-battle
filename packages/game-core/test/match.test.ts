import { describe, expect, it } from "vitest";
import { GameMatch, GameRuleError, type MatchPuzzle } from "../src/index.js";

const puzzles: MatchPuzzle[] = [
  { id: "enchanted-forest", differences: [
    { id: "a", label: "A", regions: [{ x: 0.2, y: 0.2, radius: 0.05 }] },
    { id: "b", label: "B", regions: [{ x: 0.5, y: 0.5, radius: 0.05 }] },
    { id: "c", label: "C", regions: [{ x: 0.8, y: 0.8, radius: 0.05 }] },
  ] },
  { id: "underwater-treasure", differences: [
    { id: "d", label: "D", regions: [{ x: 0.2, y: 0.8, radius: 0.05 }] },
    { id: "e", label: "E", regions: [{ x: 0.5, y: 0.2, radius: 0.05 }] },
    { id: "f", label: "F", regions: [{ x: 0.8, y: 0.5, radius: 0.05 }] },
  ] },
];

function createMatch() {
  return new GameMatch("match-1", puzzles, [
    { playerId: "p1", nickname: "첫째" },
    { playerId: "p2", nickname: "둘째" },
  ]);
}

function startPlaying(match: GameMatch, now = 1_000) {
  match.markReady("p1", now);
  match.markReady("p2", now);
  expect(match.currentState).toBe("PRELOADING");
  match.markLoaded("p1", "enchanted-forest", now + 100);
  match.markLoaded("p2", "enchanted-forest", now + 100);
  expect(match.currentState).toBe("COUNTDOWN");
  match.expire(now + 3_100);
  expect(match.currentState).toBe("PLAYING");
  return now + 3_100;
}

describe("GameMatch simultaneous race", () => {
  it("starts only after both players load the same first puzzle", () => {
    const match = createMatch();
    match.markReady("p1", 1_000);
    match.markReady("p2", 1_000);
    match.markLoaded("p1", "enchanted-forest", 1_100);
    expect(match.currentState).toBe("PRELOADING");
    match.markLoaded("p2", "enchanted-forest", 1_100);
    expect(match.currentState).toBe("COUNTDOWN");
  });

  it("lets both players find independently and advances only the player who found all three", () => {
    const match = createMatch();
    const now = startPlaying(match);
    match.guess("p1", "enchanted-forest", { x: 0.2, y: 0.2 }, now + 10);
    match.guess("p1", "enchanted-forest", { x: 0.5, y: 0.5 }, now + 20);
    const completed = match.guess("p1", "enchanted-forest", { x: 0.8, y: 0.8 }, now + 30);
    expect(completed).toMatchObject({ correct: true, puzzleCompleted: true, currentPuzzleId: "underwater-treasure" });
    expect(match.snapshot("p1").players[0]).toMatchObject({ completedPuzzleCount: 1, foundCount: 0, totalFoundCount: 3 });
    expect(match.snapshot("p2").currentPuzzleId).toBe("enchanted-forest");
  });

  it("finishes when a player clears every prepared puzzle", () => {
    const match = createMatch();
    let now = startPlaying(match);
    for (const point of [{ x: 0.2, y: 0.2 }, { x: 0.5, y: 0.5 }, { x: 0.8, y: 0.8 }]) match.guess("p1", "enchanted-forest", point, ++now);
    for (const point of [{ x: 0.2, y: 0.8 }, { x: 0.5, y: 0.2 }, { x: 0.8, y: 0.5 }]) match.guess("p1", "underwater-treasure", point, ++now);
    expect(match.snapshot("p1")).toMatchObject({ state: "FINISHED", winnerId: "p1", endReason: "COMPLETED" });
  });

  it("locks wrong input for one second without subtracting time", () => {
    const match = createMatch();
    const now = startPlaying(match);
    const wrong = match.guess("p1", "enchanted-forest", { x: 0.95, y: 0.1 }, now + 10);
    expect(wrong).toMatchObject({ correct: false, inputLockedUntilMs: now + 1_010 });
    expect(() => match.guess("p1", "enchanted-forest", { x: 0.2, y: 0.2 }, now + 500)).toThrowError(GameRuleError);
    expect(match.guess("p1", "enchanted-forest", { x: 0.2, y: 0.2 }, now + 1_011).correct).toBe(true);
  });

  it("keeps unseen answers private and restores active progress", () => {
    const match = createMatch();
    const now = startPlaying(match);
    match.guess("p1", "enchanted-forest", { x: 0.2, y: 0.2 }, now + 10);
    const snapshot = match.snapshot("p1");
    expect(snapshot.revealedDifferences).toBeNull();
    expect(snapshot.foundMarks).toHaveLength(1);
    const restored = GameMatch.restore(match.serialize());
    expect(restored.snapshot("p1")).toMatchObject({ state: "PLAYING", myFoundIds: ["a"] });
  });

  it("awards a forfeit win to the connected opponent", () => {
    const match = createMatch();
    startPlaying(match);
    match.forfeit("p1");
    expect(match.snapshot("p2")).toMatchObject({ state: "FINISHED", winnerId: "p2", endReason: "FORFEIT" });
  });
});
