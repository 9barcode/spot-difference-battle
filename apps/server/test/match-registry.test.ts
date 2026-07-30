import { DEFAULT_GAME_SCENE_ID } from "@spot-battle/shared";
import { describe, expect, it } from "vitest";
import { MatchRegistry } from "../src/match-registry.js";

describe("MatchRegistry scene selection", () => {
  it("assigns a registered scene and preserves it after restore", () => {
    const registry = new MatchRegistry();
    const match = registry.create("match-scene", [
      { playerId: "creator", nickname: "제작자" },
      { playerId: "finder", nickname: "찾는사람" },
    ]);

    expect(match.imageId).toBe(DEFAULT_GAME_SCENE_ID);
    expect(match.snapshot("creator").imageId).toBe(DEFAULT_GAME_SCENE_ID);

    const restoredRegistry = new MatchRegistry();
    const restored = restoredRegistry.restore(match.serialize());
    expect(restored.imageId).toBe(match.imageId);
  });
});
