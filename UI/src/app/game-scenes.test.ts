import { describe, expect, it } from "vitest";
import { GAME_SCENE_IDS } from "@spot-battle/shared";
import {
  DEFAULT_GAME_SCENE,
  GAME_SCENES,
  getGameScene,
} from "./game-scenes";

describe("game scene catalog", () => {
  it("registers every shared scene id", () => {
    expect([...GAME_SCENES.keys()]).toEqual([...GAME_SCENE_IDS]);
  });

  it("registers unique objects and valid auto-fill candidates", () => {
    for (const scene of GAME_SCENES.values()) {
      expect(scene.objectsById.size).toBe(scene.objects.length);
      for (const objectId of scene.autoFillObjectIds) {
        expect(scene.objectsById.has(objectId)).toBe(true);
      }
    }
  });

  it("falls back to the default scene for an unknown persisted id", () => {
    expect(getGameScene("unknown-scene")).toBe(DEFAULT_GAME_SCENE);
    expect(getGameScene(null)).toBe(DEFAULT_GAME_SCENE);
  });
});
