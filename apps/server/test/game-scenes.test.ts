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
  });
});
