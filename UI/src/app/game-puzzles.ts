import type { GamePuzzleId } from "@spot-battle/shared";
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

export interface GamePuzzleVisual {
  id: GamePuzzleId;
  label: string;
  originalSrc: string;
  modifiedSrc: string;
  alt: string;
}

export const GAME_PUZZLE_VISUALS: Readonly<Record<GamePuzzleId, GamePuzzleVisual>> = {
  "cozy-cafe": {
    id: "cozy-cafe",
    label: "햇살 좋은 카페",
    originalSrc: cafeOriginal,
    modifiedSrc: cafeModified,
    alt: "꽃병과 고양이가 있는 따뜻한 카페",
  },
  "enchanted-forest": {
    id: "enchanted-forest",
    label: "마법의 버섯 숲",
    originalSrc: forestOriginal,
    modifiedSrc: forestModified,
    alt: "토끼와 버섯집이 있는 마법의 숲",
  },
  "underwater-treasure": {
    id: "underwater-treasure",
    label: "바닷속 보물",
    originalSrc: underwaterOriginal,
    modifiedSrc: underwaterModified,
    alt: "거북이와 보물상자가 있는 바닷속",
  },
  "cyber-city": {
    id: "cyber-city",
    label: "네온 사이버 도시",
    originalSrc: cityOriginal,
    modifiedSrc: cityModified,
    alt: "네온 간판과 사람들이 있는 미래 도시",
  },
  "winter-cabin": {
    id: "winter-cabin",
    label: "눈 내린 겨울 산장",
    originalSrc: winterOriginal,
    modifiedSrc: winterModified,
    alt: "모닥불과 눈사람이 있는 겨울 산장",
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
