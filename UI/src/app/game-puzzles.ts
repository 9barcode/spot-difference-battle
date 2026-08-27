import {
  GAME_PUZZLE_ASSET_MANIFEST,
  type GamePuzzleId,
  type PuzzleAssetMetadata,
} from "@spot-battle/shared";
import cafeOriginal from "@/imports/cozy-cafe-original-v3.webp";
import cafeModified from "@/imports/cozy-cafe-modified-v3.webp";
import forestOriginal from "@/imports/enchanted-forest-original-v3.webp";
import forestModified from "@/imports/enchanted-forest-modified-v3.webp";
import underwaterOriginal from "@/imports/underwater-treasure-original-v2.webp";
import underwaterModified from "@/imports/underwater-treasure-modified-v2.webp";
import cityOriginal from "@/imports/cyber-city-original-v3.webp";
import cityModified from "@/imports/cyber-city-modified-v3.webp";
import winterOriginal from "@/imports/winter-cabin-original.webp";
import winterModified from "@/imports/winter-cabin-modified.webp";
import spaceOriginal from "@/imports/space-station-original.webp";
import spaceModified from "@/imports/space-station-modified.webp";
import hawaiiOriginal from "@/imports/hawaiian-beach-original.webp";
import hawaiiModified from "@/imports/hawaiian-beach-modified.webp";
import alchemistOriginal from "@/imports/alchemist-workshop-original.webp";
import alchemistModified from "@/imports/alchemist-workshop-modified.webp";
import dinosaurOriginal from "@/imports/dinosaur-valley-original.webp";
import dinosaurModified from "@/imports/dinosaur-valley-modified.webp";
import pirateOriginal from "@/imports/pirate-ship-original.webp";
import pirateModified from "@/imports/pirate-ship-modified.webp";
import shrineOriginal from "@/imports/japanese-shrine-original.webp";
import shrineModified from "@/imports/japanese-shrine-modified.webp";
import palaceOriginal from "@/imports/korean-palace-original.webp";
import palaceModified from "@/imports/korean-palace-modified.webp";
import castleOriginal from "@/imports/medieval-castle-original.webp";
import castleModified from "@/imports/medieval-castle-modified.webp";
import ninjaOriginal from "@/imports/japanese-ninja-original.webp";
import ninjaModified from "@/imports/japanese-ninja-modified.webp";
import goblinOriginal from "@/imports/korean-goblin-original.webp";
import goblinModified from "@/imports/korean-goblin-modified.webp";
import dragonOriginal from "@/imports/medieval-dragon-original.webp";
import dragonModified from "@/imports/medieval-dragon-modified.webp";

export interface GamePuzzleVisual {
  id: GamePuzzleId;
  metadata: PuzzleAssetMetadata;
  label: string;
  originalSrc: string;
  modifiedSrc: string;
  alt: string;
}

export const GAME_PUZZLE_VISUALS: Readonly<Record<GamePuzzleId, GamePuzzleVisual>> = {
  "cozy-cafe": {
    id: "cozy-cafe",
    metadata: GAME_PUZZLE_ASSET_MANIFEST["cozy-cafe"],
    label: "햇살 좋은 카페",
    originalSrc: cafeOriginal,
    modifiedSrc: cafeModified,
    alt: "꽃병과 고양이가 있는 따뜻한 카페",
  },
  "enchanted-forest": {
    id: "enchanted-forest",
    metadata: GAME_PUZZLE_ASSET_MANIFEST["enchanted-forest"],
    label: "마법의 버섯 숲",
    originalSrc: forestOriginal,
    modifiedSrc: forestModified,
    alt: "토끼와 버섯집이 있는 마법의 숲",
  },
  "underwater-treasure": {
    id: "underwater-treasure",
    metadata: GAME_PUZZLE_ASSET_MANIFEST["underwater-treasure"],
    label: "바닷속 보물",
    originalSrc: underwaterOriginal,
    modifiedSrc: underwaterModified,
    alt: "거북이와 보물상자가 있는 바닷속",
  },
  "cyber-city": {
    id: "cyber-city",
    metadata: GAME_PUZZLE_ASSET_MANIFEST["cyber-city"],
    label: "네온 사이버 도시",
    originalSrc: cityOriginal,
    modifiedSrc: cityModified,
    alt: "네온 간판과 사람들이 있는 미래 도시",
  },
  "winter-cabin": {
    id: "winter-cabin",
    metadata: GAME_PUZZLE_ASSET_MANIFEST["winter-cabin"],
    label: "눈 내린 겨울 산장",
    originalSrc: winterOriginal,
    modifiedSrc: winterModified,
    alt: "모닥불과 눈사람이 있는 겨울 산장",
  },
  "space-station": {
    id: "space-station",
    metadata: GAME_PUZZLE_ASSET_MANIFEST["space-station"],
    label: "화성 궤도 우주정거장",
    originalSrc: spaceOriginal,
    modifiedSrc: spaceModified,
    alt: "우주비행사와 행성이 보이는 우주정거장",
  },
  "hawaiian-beach": {
    id: "hawaiian-beach",
    metadata: GAME_PUZZLE_ASSET_MANIFEST["hawaiian-beach"],
    label: "화창한 하와이 해변",
    originalSrc: hawaiiOriginal,
    modifiedSrc: hawaiiModified,
    alt: "야자수와 서핑보드가 있는 하와이 해변",
  },
  "alchemist-workshop": {
    id: "alchemist-workshop",
    metadata: GAME_PUZZLE_ASSET_MANIFEST["alchemist-workshop"],
    label: "신비한 연금술 작업실",
    originalSrc: alchemistOriginal,
    modifiedSrc: alchemistModified,
    alt: "물약과 가마솥이 있는 연금술 작업실",
  },
  "dinosaur-valley": {
    id: "dinosaur-valley",
    metadata: GAME_PUZZLE_ASSET_MANIFEST["dinosaur-valley"],
    label: "화산 아래 공룡 계곡",
    originalSrc: dinosaurOriginal,
    modifiedSrc: dinosaurModified,
    alt: "화산과 공룡알이 있는 공룡 계곡",
  },
  "pirate-ship": {
    id: "pirate-ship",
    metadata: GAME_PUZZLE_ASSET_MANIFEST["pirate-ship"],
    label: "노을진 해적선 갑판",
    originalSrc: pirateOriginal,
    modifiedSrc: pirateModified,
    alt: "해적과 대포가 있는 범선 갑판",
  },
  "japanese-shrine": {
    id: "japanese-shrine",
    metadata: GAME_PUZZLE_ASSET_MANIFEST["japanese-shrine"],
    label: "벚꽃 핀 일본 신사",
    originalSrc: shrineOriginal,
    modifiedSrc: shrineModified,
    alt: "도리이와 여우 가면 인물이 있는 일본 신사",
  },
  "korean-palace": {
    id: "korean-palace",
    metadata: GAME_PUZZLE_ASSET_MANIFEST["korean-palace"],
    label: "달빛 아래 한국 궁궐",
    originalSrc: palaceOriginal,
    modifiedSrc: palaceModified,
    alt: "달과 구미호가 있는 한국 궁궐 정원",
  },
  "medieval-castle": {
    id: "medieval-castle",
    metadata: GAME_PUZZLE_ASSET_MANIFEST["medieval-castle"],
    label: "중세 성의 기사",
    originalSrc: castleOriginal,
    modifiedSrc: castleModified,
    alt: "기사와 보물상자가 있는 중세 성 광장",
  },
  "japanese-ninja": {
    id: "japanese-ninja",
    metadata: GAME_PUZZLE_ASSET_MANIFEST["japanese-ninja"],
    label: "달빛 지붕의 닌자",
    originalSrc: ninjaOriginal,
    modifiedSrc: ninjaModified,
    alt: "달빛 아래 일본 마을 지붕에 선 닌자",
  },
  "korean-goblin": {
    id: "korean-goblin",
    metadata: GAME_PUZZLE_ASSET_MANIFEST["korean-goblin"],
    label: "도깨비의 신비한 정원",
    originalSrc: goblinOriginal,
    modifiedSrc: goblinModified,
    alt: "도깨비와 불꽃과 석상이 있는 정원",
  },
  "medieval-dragon": {
    id: "medieval-dragon",
    metadata: GAME_PUZZLE_ASSET_MANIFEST["medieval-dragon"],
    label: "보물 위의 중세 용",
    originalSrc: dragonOriginal,
    modifiedSrc: dragonModified,
    alt: "보물 더미 위에서 잠든 용과 마법 검",
  },
};

const preloadCache = new Map<GamePuzzleId, Promise<void>>();

export function preloadPuzzle(puzzleId: GamePuzzleId): Promise<void> {
  const cached = preloadCache.get(puzzleId);
  if (cached) return cached;

  const puzzle = GAME_PUZZLE_VISUALS[puzzleId];
  const loading = Promise.all([puzzle.originalSrc, puzzle.modifiedSrc].map((src) => new Promise<void>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve();
    image.onerror = () => reject(new Error(`${puzzle.label} 이미지를 불러오지 못했습니다.`));
    image.src = src;
  }))).then(() => undefined).catch((error: unknown) => {
    preloadCache.delete(puzzleId);
    throw error;
  });
  preloadCache.set(puzzleId, loading);
  return loading;
}
