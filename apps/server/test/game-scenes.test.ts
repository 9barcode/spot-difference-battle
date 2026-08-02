import {
  DEFAULT_GAME_SCENE_ID,
  GAME_SCENE_IDS,
} from "@spot-battle/shared";
import { describe, expect, it } from "vitest";
import {
  defaultSceneOverride,
  loadGameSceneOriginals,
} from "../src/game-scenes.js";

describe("server game scene originals", () => {
  it("registers an original image for every shared scene id", async () => {
    const fixture = Buffer.from("scene-fixture");
    const originals = await loadGameSceneOriginals(
      defaultSceneOverride(fixture),
    );

    expect([...originals.keys()]).toEqual([...GAME_SCENE_IDS]);
    expect(originals.get(DEFAULT_GAME_SCENE_ID)).toEqual(fixture);

    const laboratory = originals.get("cartoon-laboratory");
    expect(laboratory?.subarray(1, 4).toString("ascii")).toBe("PNG");
    expect(laboratory?.readUInt32BE(16)).toBe(1920);
    expect(laboratory?.readUInt32BE(20)).toBe(1080);

    for (const sceneId of [
      "cozy-cafe",
      "enchanted-forest",
      "cyber-city",
      "underwater-treasure",
    ] as const) {
      const image = originals.get(sceneId);
      expect(image?.subarray(1, 4).toString("ascii")).toBe("PNG");
      expect(image?.readUInt32BE(16)).toBe(1024);
      expect(image?.readUInt32BE(20)).toBe(1024);
    }
  });
});
