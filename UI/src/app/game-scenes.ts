import {
  DEFAULT_GAME_SCENE_ID,
  type GameSceneId,
} from "@spot-battle/shared";
import livingRoomImage from "@/imports/image.png";
import laboratoryImage from "@/imports/laboratory-1920.webp";
import cafeImage from "@/imports/cozy-cafe.webp";
import forestImage from "@/imports/enchanted-forest.webp";
import cityImage from "@/imports/cyber-city.webp";
import underwaterImage from "@/imports/underwater-treasure.webp";
import { LABORATORY_SCENE_OBJECTS } from "./laboratory-scene-objects";
import {
  CAFE_SCENE_OBJECTS,
  CITY_SCENE_OBJECTS,
  FOREST_SCENE_OBJECTS,
  UNDERWATER_SCENE_OBJECTS,
} from "./additional-scene-objects";
import {
  SCENE_OBJECTS,
  type SceneMaskPrimitive,
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
  const objects = [...definition.objects].sort(
    (left, right) => (left.hitPriority ?? 0) - (right.hitPriority ?? 0),
  );
  return {
    ...definition,
    objects,
    objectsById: new Map(objects.map((object) => [object.id, object])),
  };
}

const LABORATORY_SOURCE_HEIGHT = 572;
const LABORATORY_PADDED_HEIGHT = 576;
const LABORATORY_TOP_PADDING = 2;

function remapLaboratoryY(y: number): number {
  return (
    (y * LABORATORY_SOURCE_HEIGHT + LABORATORY_TOP_PADDING) /
    LABORATORY_PADDED_HEIGHT
  );
}

function remapLaboratoryYLength(value: number): number {
  return (value * LABORATORY_SOURCE_HEIGHT) / LABORATORY_PADDED_HEIGHT;
}

function remapLaboratoryMask(
  primitive: SceneMaskPrimitive,
): SceneMaskPrimitive {
  if (primitive.kind === "ellipse") {
    return {
      ...primitive,
      cy: remapLaboratoryY(primitive.cy),
      ry: remapLaboratoryYLength(primitive.ry),
    };
  }
  if (primitive.kind === "rect") {
    return {
      ...primitive,
      y: remapLaboratoryY(primitive.y),
      height: remapLaboratoryYLength(primitive.height),
      radius: primitive.radius
        ? remapLaboratoryYLength(primitive.radius)
        : primitive.radius,
    };
  }
  return {
    ...primitive,
    points: primitive.points.map(([x, y]) => [x, remapLaboratoryY(y)]),
  };
}

const laboratorySceneObjects = LABORATORY_SCENE_OBJECTS.map((object) => ({
  ...object,
  region: {
    ...object.region,
    y: remapLaboratoryY(object.region.y),
  },
  masks: object.masks.map(remapLaboratoryMask),
  excludeMasks: object.excludeMasks?.map(remapLaboratoryMask),
}));

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
  objects: laboratorySceneObjects,
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

const userCreatedAsset = {
  licenseStatus: "VERIFIED" as const,
  source:
    "User-created image pair; project use authorized by the creator, 2026-08-02",
};

const cozyCafe = createScene({
  id: "cozy-cafe",
  label: "아늑한 카페",
  imageSrc: cafeImage,
  imageAlt: "빵 진열장과 고양이, 장미가 있는 따뜻한 카페",
  objects: CAFE_SCENE_OBJECTS,
  autoFillObjectIds: ["cafe-left-pendant", "cafe-clock", "cafe-cake", "cafe-cat", "cafe-roses"],
  asset: userCreatedAsset,
});

const enchantedForest = createScene({
  id: "enchanted-forest",
  label: "마법의 버섯 숲",
  imageSrc: forestImage,
  imageAlt: "버섯집과 토끼, 빛나는 버섯이 있는 마법의 숲",
  objects: FOREST_SCENE_OBJECTS,
  autoFillObjectIds: ["forest-chimney", "forest-sun", "forest-scarf", "forest-bridge", "forest-right-glow-mushrooms"],
  asset: userCreatedAsset,
});

const cyberCity = createScene({
  id: "cyber-city",
  label: "비 오는 사이버 도시",
  imageSrc: cityImage,
  imageAlt: "네온 간판과 우산 쓴 사람들이 있는 비 오는 미래 도시",
  objects: CITY_SCENE_OBJECTS,
  autoFillObjectIds: ["city-dragon-sign", "city-tech-sign", "city-headphone-person", "city-large-umbrella", "city-bollard"],
  asset: userCreatedAsset,
});

const underwaterTreasure = createScene({
  id: "underwater-treasure",
  label: "바닷속 보물",
  imageSrc: underwaterImage,
  imageAlt: "바다거북과 해파리, 보물상자가 있는 산호초 바다",
  objects: UNDERWATER_SCENE_OBJECTS,
  autoFillObjectIds: ["underwater-jellyfish", "underwater-chest", "underwater-starfish", "underwater-turtle", "underwater-right-coral"],
  asset: userCreatedAsset,
});
export const GAME_SCENES: ReadonlyMap<GameSceneId, GameSceneDefinition> = new Map([
  [prototypeRoom.id, prototypeRoom],
  [cartoonLaboratory.id, cartoonLaboratory],
  [cozyCafe.id, cozyCafe],
  [enchantedForest.id, enchantedForest],
  [cyberCity.id, cyberCity],
  [underwaterTreasure.id, underwaterTreasure],
]);

export const DEFAULT_GAME_SCENE =
  GAME_SCENES.get(DEFAULT_GAME_SCENE_ID) ?? prototypeRoom;

export function getGameScene(
  imageId: string | null | undefined,
): GameSceneDefinition {
  return GAME_SCENES.get(imageId as GameSceneId) ?? DEFAULT_GAME_SCENE;
}
