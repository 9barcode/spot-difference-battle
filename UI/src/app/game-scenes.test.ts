import { describe, expect, it } from "vitest";
import {
  GAME_SCENE_IDS,
  GAME_SCENE_OBJECT_IDS,
} from "@spot-battle/shared";
import {
  DEFAULT_GAME_SCENE,
  GAME_SCENES,
  getGameScene,
} from "./game-scenes";
import { buildAutoFilledDifferences } from "./FreeformEditor";

describe("game scene catalog", () => {
  it("registers every shared scene id", () => {
    expect([...GAME_SCENES.keys()]).toEqual([...GAME_SCENE_IDS]);
    expect(GAME_SCENES.get("cartoon-laboratory")?.objects).toHaveLength(18);
  });

  it("registers unique objects and valid auto-fill candidates", () => {
    for (const scene of GAME_SCENES.values()) {
      expect(scene.objectsById.size).toBe(scene.objects.length);
      expect([...scene.objectsById.keys()]).toEqual([
        ...GAME_SCENE_OBJECT_IDS[scene.id],
      ]);
      for (const objectId of scene.autoFillObjectIds) {
        expect(scene.objectsById.has(objectId)).toBe(true);
      }
    }
  });

  it("builds three server-valid, separated auto-fill answers for every scene", () => {
    for (const scene of GAME_SCENES.values()) {
      const differences = buildAutoFilledDifferences([], scene);
      expect(differences).toHaveLength(3);

      for (let left = 0; left < differences.length; left += 1) {
        for (let right = left + 1; right < differences.length; right += 1) {
          const a = differences[left]!;
          const b = differences[right]!;
          const distance = Math.hypot(a.region.x - b.region.x, a.region.y - b.region.y);
          expect(distance).toBeGreaterThanOrEqual(
            a.region.radius + b.region.radius + 0.03,
          );
        }
      }
    }
  });

  it("falls back to the default scene for an unknown persisted id", () => {
    expect(getGameScene("unknown-scene")).toBe(DEFAULT_GAME_SCENE);
    expect(getGameScene(null)).toBe(DEFAULT_GAME_SCENE);
  });
});
