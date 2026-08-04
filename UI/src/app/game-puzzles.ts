import type { GamePuzzleId } from "@spot-battle/shared";
import forestOriginal from "@/imports/enchanted-forest.webp";
import forestModified from "@/imports/enchanted-forest-modified-reference.png";
import underwaterOriginal from "@/imports/underwater-treasure.webp";
import underwaterModified from "@/imports/underwater-treasure-modified-reference.png";

export interface GamePuzzleVisual {
  id: GamePuzzleId;
  label: string;
  originalSrc: string;
  modifiedSrc: string;
  alt: string;
}

export const GAME_PUZZLE_VISUALS: Readonly<Record<GamePuzzleId, GamePuzzleVisual>> = {
  "enchanted-forest": {
    id: "enchanted-forest",
    label: "마법의 버섯 숲",
    originalSrc: forestOriginal,
    modifiedSrc: forestModified,
    alt: "버섯집과 토끼가 있는 마법의 숲",
  },
  "underwater-treasure": {
    id: "underwater-treasure",
    label: "바닷속 보물",
    originalSrc: underwaterOriginal,
    modifiedSrc: underwaterModified,
    alt: "거북이와 보물상자가 있는 바닷속",
  },
};

export function preloadPuzzle(puzzleId: GamePuzzleId): Promise<void> {
  const puzzle = GAME_PUZZLE_VISUALS[puzzleId];
  return Promise.all([puzzle.originalSrc, puzzle.modifiedSrc].map((src) => new Promise<void>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve();
    image.onerror = () => reject(new Error(`${puzzle.label} 이미지를 불러오지 못했습니다.`));
    image.src = src;
  }))).then(() => undefined);
}
