import {
  DEFAULT_GAME_SCENE_ID,
  GAME_SCENE_IDS,
  type GameSceneId,
} from "@spot-battle/shared";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const GAME_SCENE_ORIGINAL_FILES = {
  "prototype-room": "image.png",
  "cartoon-laboratory": "laboratory-1920.png",
  "cozy-cafe": "cozy-cafe.png",
  "enchanted-forest": "enchanted-forest.png",
  "cyber-city": "cyber-city.png",
  "underwater-treasure": "underwater-treasure.png",
} as const satisfies Record<GameSceneId, string>;

const DEVELOPMENT_GAME_ASSET_ROOT = new URL(
  "../../../UI/src/imports/",
  import.meta.url,
);

export type GameSceneImageOverrides = Partial<Record<GameSceneId, Buffer>>;

export async function loadGameSceneOriginals(
  overrides: GameSceneImageOverrides = {},
  assetRoot?: string,
): Promise<ReadonlyMap<GameSceneId, Buffer>> {
  const entries = await Promise.all(
    GAME_SCENE_IDS.map(async (sceneId) => [
      sceneId,
      overrides[sceneId] ??
        await readFile(
          assetRoot
            ? join(assetRoot, GAME_SCENE_ORIGINAL_FILES[sceneId])
            : new URL(GAME_SCENE_ORIGINAL_FILES[sceneId], DEVELOPMENT_GAME_ASSET_ROOT),
        ),
    ] as const),
  );
  return new Map(entries);
}

export function defaultSceneOverride(
  image: Buffer | undefined,
): GameSceneImageOverrides {
  return image ? { [DEFAULT_GAME_SCENE_ID]: image } : {};
}
