import type { MatchPuzzle } from "@spot-battle/game-core";

export const GAME_PUZZLES: readonly MatchPuzzle[] = [
  {
    id: "cozy-cafe",
    differences: [
      { id: "cafe-clock-hands", label: "벽시계 바늘", regions: [{ x: 0.125, y: 0.155, radius: 0.09 }] },
      { id: "cafe-bouquet", label: "테이블 꽃", regions: [{ x: 0.52, y: 0.59, radius: 0.14 }] },
      { id: "cafe-cat", label: "의자 위 고양이", regions: [{ x: 0.86, y: 0.8, radius: 0.13 }] },
    ],
  },
  {
    id: "enchanted-forest",
    differences: [
      { id: "forest-lantern", label: "매달린 등불", regions: [{ x: 0.31, y: 0.33, radius: 0.13 }] },
      { id: "forest-scarf", label: "토끼 목도리", regions: [{ x: 0.27, y: 0.78, radius: 0.08 }] },
      { id: "forest-roof-bird", label: "버섯 지붕의 새", regions: [{ x: 0.79, y: 0.17, radius: 0.06 }] },
    ],
  },
  {
    id: "underwater-treasure",
    differences: [
      { id: "underwater-turtle-hat", label: "거북이 모자", regions: [{ x: 0.39, y: 0.11, radius: 0.1 }] },
      { id: "underwater-jellyfish", label: "해파리 색", regions: [{ x: 0.8, y: 0.22, radius: 0.14 }] },
      { id: "underwater-chest", label: "보물상자", regions: [{ x: 0.5, y: 0.76, radius: 0.18 }] },
    ],
  },
  {
    id: "cyber-city",
    differences: [
      { id: "city-neon-sign", label: "대형 네온 간판", regions: [{ x: 0.23, y: 0.24, radius: 0.16 }] },
      { id: "city-flying-car", label: "하늘의 자동차", regions: [{ x: 0.75, y: 0.24, radius: 0.15 }] },
      { id: "city-headphones", label: "가운데 인물의 헤드폰", regions: [{ x: 0.52, y: 0.69, radius: 0.065 }] },
    ],
  },
  {
    id: "winter-cabin",
    differences: [
      { id: "winter-chimney-smoke", label: "굴뚝 연기", regions: [{ x: 0.66, y: 0.12, radius: 0.1 }] },
      { id: "winter-snowman-hat", label: "눈사람 모자", regions: [{ x: 0.84, y: 0.6, radius: 0.11 }] },
      { id: "winter-campfire", label: "모닥불 색", regions: [{ x: 0.51, y: 0.78, radius: 0.13 }] },
    ],
  },
] as const;

export const ACTIVE_GAME_PUZZLES: readonly MatchPuzzle[] = GAME_PUZZLES;

export function shuffledGamePuzzles(): MatchPuzzle[] {
  return [...ACTIVE_GAME_PUZZLES]
    .map((puzzle) => ({ puzzle, order: Math.random() }))
    .sort((left, right) => left.order - right.order)
    .map(({ puzzle }) => structuredClone(puzzle));
}