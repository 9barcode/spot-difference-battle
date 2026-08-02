import {
  DEFAULT_GAME_SCENE_ID,
  type GameSceneId,
} from "@spot-battle/shared";
import livingRoomImage from "@/imports/image.png";
import laboratoryImage from "@/imports/laboratory.png";
import { LABORATORY_SCENE_OBJECTS } from "./laboratory-scene-objects";
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

const cartoonLaboratory = createScene({
  id: "cartoon-laboratory",
  label: "카툰 연구실",
  imageSrc: laboratoryImage,
  imageAlt: "로봇 팔과 실험 도구가 놓인 밝은 카툰 연구실",
  objects: LABORATORY_SCENE_OBJECTS,
  autoFillObjectIds: [
    "lab-clock",
    "test-tubes",
    "toolbox",
    "large-flask",
    "monitor",
    "upper-plant",
  ],
  asset: {
    licenseStatus: "VERIFIED",
    source:
      "User-created Nano Banana generation; unrestricted project use authorized by the creator, 2026-07-31",
  },
});

export const GAME_SCENES: ReadonlyMap<GameSceneId, GameSceneDefinition> = new Map([
  [prototypeRoom.id, prototypeRoom],
  [cartoonLaboratory.id, cartoonLaboratory],
]);

export const DEFAULT_GAME_SCENE =
  GAME_SCENES.get(DEFAULT_GAME_SCENE_ID) ?? prototypeRoom;

export function getGameScene(
  imageId: string | null | undefined,
): GameSceneDefinition {
  return GAME_SCENES.get(imageId as GameSceneId) ?? DEFAULT_GAME_SCENE;
}
