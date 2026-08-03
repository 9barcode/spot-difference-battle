import {
  DEFAULT_GAME_SCENE_ID,
  GAME_SCENE_IDS,
} from "@spot-battle/shared";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
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

  it("loads every original from a packaged production asset directory", async () => {
    const assetRoot = await mkdtemp(join(tmpdir(), "spot-battle-assets-"));
    const filenames = [
      "image.png",
      "laboratory-1920.png",
      "cozy-cafe.png",
      "enchanted-forest.png",
      "cyber-city.png",
      "underwater-treasure.png",
    ] as const;

    try {
      await Promise.all(
        filenames.map((filename, index) =>
          writeFile(join(assetRoot, filename), Buffer.from(`scene-${index}`)),
        ),
      );

      const originals = await loadGameSceneOriginals({}, assetRoot);

      GAME_SCENE_IDS.forEach((sceneId, index) => {
        expect(originals.get(sceneId)?.toString()).toBe(`scene-${index}`);
      });
    } finally {
      await rm(assetRoot, { recursive: true, force: true });
    }
  });
});
