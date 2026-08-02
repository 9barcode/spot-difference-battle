import {
  DEFAULT_GAME_SCENE_ID,
  GAME_SCENE_IDS,
  type GameSceneId,
} from "@spot-battle/shared";
import { readFile } from "node:fs/promises";

const SERVER_GAME_SCENE_ORIGINALS = {
  "prototype-room": new URL(
    "../../../UI/src/imports/image.png",
    import.meta.url,
  ),
  "cartoon-laboratory": new URL(
    "../../../UI/src/imports/laboratory-1920.png",
    import.meta.url,
  ),
  "cozy-cafe": new URL(
    "../../../UI/src/imports/cozy-cafe.png",
    import.meta.url,
  ),
  "enchanted-forest": new URL(
    "../../../UI/src/imports/enchanted-forest.png",
    import.meta.url,
  ),
  "cyber-city": new URL(
    "../../../UI/src/imports/cyber-city.png",
    import.meta.url,
  ),
  "underwater-treasure": new URL(
    "../../../UI/src/imports/underwater-treasure.png",
    import.meta.url,
  ),} as const satisfies Record<GameSceneId, URL>;

export type GameSceneImageOverrides = Partial<Record<GameSceneId, Buffer>>;

export async function loadGameSceneOriginals(
  overrides: GameSceneImageOverrides = {},
): Promise<ReadonlyMap<GameSceneId, Buffer>> {
  const entries = await Promise.all(
    GAME_SCENE_IDS.map(async (sceneId) => [
      sceneId,
      overrides[sceneId] ??
        await readFile(SERVER_GAME_SCENE_ORIGINALS[sceneId]),
    ] as const),
  );
  return new Map(entries);
}

export function defaultSceneOverride(
  image: Buffer | undefined,
): GameSceneImageOverrides {
  return image ? { [DEFAULT_GAME_SCENE_ID]: image } : {};
}
