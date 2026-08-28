import {
  GAME_PUZZLE_ASSET_MANIFEST,
  type GamePuzzleId,
  type PuzzleAssetMetadata,
} from "@spot-battle/shared";
import cafeOriginal from "@/imports/cozy-cafe-original-v2.webp";
import cafeModified from "@/imports/cozy-cafe-modified-v2.webp";
import forestOriginal from "@/imports/enchanted-forest-original-v2.webp";
import forestModified from "@/imports/enchanted-forest-modified-v2.webp";
import underwaterOriginal from "@/imports/underwater-treasure-original-v2.webp";
import underwaterModified from "@/imports/underwater-treasure-modified-v2.webp";
import cityOriginal from "@/imports/cyber-city-original-v2.webp";
import cityModified from "@/imports/cyber-city-modified-v2.webp";
import winterOriginal from "@/imports/winter-cabin-original.webp";
import winterModified from "@/imports/winter-cabin-modified.webp";
import homeOfficeOriginal from "@/imports/home-office-original.webp";
import homeOfficeModified from "@/imports/home-office-modified.webp";
import farmersMarketOriginal from "@/imports/farmers-market-original.webp";
import farmersMarketModified from "@/imports/farmers-market-modified.webp";
import bathroomVanityOriginal from "@/imports/bathroom-vanity-original.webp";
import bathroomVanityModified from "@/imports/bathroom-vanity-modified.webp";
import lakesidePicnicOriginal from "@/imports/lakeside-picnic-original.webp";
import lakesidePicnicModified from "@/imports/lakeside-picnic-modified.webp";
import laundryRoomOriginal from "@/imports/laundry-room-original.webp";
import laundryRoomModified from "@/imports/laundry-room-modified.webp";

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
  "home-office": {
    id: "home-office",
    metadata: GAME_PUZZLE_ASSET_MANIFEST["home-office"],
    label: "햇살 좋은 홈오피스",
    originalSrc: homeOfficeOriginal,
    modifiedSrc: homeOfficeModified,
    alt: "노트북과 스탠드가 놓인 햇살 좋은 홈오피스",
  },
  "farmers-market": {
    id: "farmers-market",
    metadata: GAME_PUZZLE_ASSET_MANIFEST["farmers-market"],
    label: "정원 농산물 가판대",
    originalSrc: farmersMarketOriginal,
    modifiedSrc: farmersMarketModified,
    alt: "꽃과 과일, 채소가 진열된 야외 농산물 가판대",
  },
  "bathroom-vanity": {
    id: "bathroom-vanity",
    metadata: GAME_PUZZLE_ASSET_MANIFEST["bathroom-vanity"],
    label: "뉴트럴 욕실 세면대",
    originalSrc: bathroomVanityOriginal,
    modifiedSrc: bathroomVanityModified,
    alt: "원형 거울과 수건이 있는 뉴트럴톤 욕실 세면대",
  },
  "lakeside-picnic": {
    id: "lakeside-picnic",
    metadata: GAME_PUZZLE_ASSET_MANIFEST["lakeside-picnic"],
    label: "호숫가 피크닉",
    originalSrc: lakesidePicnicOriginal,
    modifiedSrc: lakesidePicnicModified,
    alt: "랜턴과 피크닉 바구니가 놓인 호숫가 나무 테이블",
  },
  "laundry-room": {
    id: "laundry-room",
    metadata: GAME_PUZZLE_ASSET_MANIFEST["laundry-room"],
    label: "아늑한 세탁실",
    originalSrc: laundryRoomOriginal,
    modifiedSrc: laundryRoomModified,
    alt: "세탁기와 다리미판이 있는 밝고 아늑한 세탁실",
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
