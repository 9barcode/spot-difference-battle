import { describe, expect, it } from "vitest";
import { GAME_PUZZLES } from "../src/game-puzzles.js";
import { MatchRegistry } from "../src/match-registry.js";

describe("MatchRegistry", () => {
  it("creates a match with the same non-empty puzzle sequence for both players", () => {
    const registry = new MatchRegistry();
    const match = registry.create("m1", [{ playerId: "p1", nickname: "하나" }, { playerId: "p2", nickname: "둘" }]);
    expect(match.puzzles).toHaveLength(1);
    expect(match.puzzles[0]?.id).toBe("underwater-treasure");
    expect(match.snapshot("p1").currentPuzzleId).toBe(match.snapshot("p2").currentPuzzleId);
  });

  it("restores and removes player lookup", () => {
    const registry = new MatchRegistry();
    const match = registry.create("m1", [{ playerId: "p1", nickname: "하나" }, { playerId: "p2", nickname: "둘" }]);
    const restoredRegistry = new MatchRegistry(GAME_PUZZLES);
    restoredRegistry.restore(match.serialize());
    expect(restoredRegistry.getCurrentForPlayer("p1")?.matchId).toBe("m1");
    expect(restoredRegistry.remove("m1")).toBe(true);
    expect(restoredRegistry.getCurrentForPlayer("p1")).toBeNull();
  });
});
