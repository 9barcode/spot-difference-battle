import { describe, expect, it } from "vitest";
import { GAME_PUZZLE_ASSET_MANIFEST, GAME_PUZZLE_IDS } from "@spot-battle/shared";
import { GAME_PUZZLES } from "../src/game-puzzles.js";
import { MatchRegistry } from "../src/match-registry.js";

describe("MatchRegistry", () => {
  const expectedIds = (difficulty: "EASY" | "NORMAL" | "HARD") => {
    const target = { EASY: "EASY", NORMAL: "MEDIUM", HARD: "HARD" }[difficulty];
    return GAME_PUZZLE_IDS.filter((puzzleId) => {
      const assetDifficulty = GAME_PUZZLE_ASSET_MANIFEST[puzzleId].difficulty;
      return assetDifficulty === "UNRATED" || assetDifficulty === target;
    });
  };

  it("creates a match with the same non-empty puzzle sequence for both players", () => {
    const registry = new MatchRegistry();
    const match = registry.create("m1", [{ playerId: "p1", nickname: "하나" }, { playerId: "p2", nickname: "둘" }]);
    expect(match.puzzles).toHaveLength(expectedIds("NORMAL").length);
    expect(new Set(match.puzzles.map((puzzle) => puzzle.id))).toEqual(new Set(expectedIds("NORMAL")));
    expect(match.snapshot("p1").currentPuzzleId).toBe(match.snapshot("p2").currentPuzzleId);
  });

  it("selects rated puzzles by match difficulty and shares only unrated puzzles", () => {
    for (const difficulty of ["EASY", "NORMAL", "HARD"] as const) {
      const registry = new MatchRegistry();
      const match = registry.create(
        `m-${difficulty}`,
        [
          { playerId: `p1-${difficulty}`, nickname: "하나" },
          { playerId: `p2-${difficulty}`, nickname: "둘" },
        ],
        { mode: "STANDARD", difficulty },
      );
      expect(new Set(match.puzzles.map((puzzle) => puzzle.id))).toEqual(new Set(expectedIds(difficulty)));
    }
  });

  it("keeps the server catalog aligned with the versioned asset manifest", () => {
    expect(GAME_PUZZLES.map((puzzle) => puzzle.id).sort()).toEqual([...GAME_PUZZLE_IDS].sort());

    for (const puzzle of GAME_PUZZLES) {
      expect(GAME_PUZZLE_ASSET_MANIFEST[puzzle.id as keyof typeof GAME_PUZZLE_ASSET_MANIFEST]).toBeDefined();
    }
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
