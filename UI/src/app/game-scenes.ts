import {
  DEFAULT_GAME_SCENE_ID,
  type GameSceneId,
} from "@spot-battle/shared";
import livingRoomImage from "@/imports/image.png";
import {
  SCENE_OBJECTS,
  type SceneObjectDefinition,
} from "./scene-objects";

export interface GameSceneDefinition {
  id: GameSceneId;
  label: string;
  imageSrc: string;
  imageAlt: string;
  objects: readonly SceneObjectDefinition[];
  objectsById: ReadonlyMap<string, SceneObjectDefinition>;
  autoFillObjectIds: readonly string[];
  asset: {
    licenseStatus: "VERIFIED" | "UNVERIFIED";
    source: string;
  };
}

function createScene(
  definition: Omit<GameSceneDefinition, "objectsById">,
): GameSceneDefinition {
  return {
    ...definition,
    objectsById: new Map(
      definition.objects.map((object) => [object.id, object]),
    ),
  };
}

const prototypeRoom = createScene({
  id: "prototype-room",
  label: "따뜻한 거실",
  imageSrc: livingRoomImage,
  imageAlt: "따뜻한 거실과 귀여운 고양이",
  objects: SCENE_OBJECTS,
  autoFillObjectIds: ["clock", "ball", "cloud", "pillow", "vase", "picture", "cat"],
  asset: {
    licenseStatus: "UNVERIFIED",
    source: "Figma Make import",
  },
});

export const GAME_SCENES: ReadonlyMap<GameSceneId, GameSceneDefinition> = new Map([
  [prototypeRoom.id, prototypeRoom],
]);

export const DEFAULT_GAME_SCENE =
  GAME_SCENES.get(DEFAULT_GAME_SCENE_ID) ?? prototypeRoom;

export function getGameScene(
  imageId: string | null | undefined,
): GameSceneDefinition {
  return GAME_SCENES.get(imageId as GameSceneId) ?? DEFAULT_GAME_SCENE;
}
