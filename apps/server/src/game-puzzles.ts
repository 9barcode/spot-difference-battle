import type { MatchPuzzle } from "@spot-battle/game-core";

export const GAME_PUZZLES: readonly MatchPuzzle[] = [
  {
    id: "enchanted-forest",
    differences: [
      { id: "forest-smoke", label: "굴뚝 연기", regions: [{ x: 0.31, y: 0.13, radius: 0.11 }] },
      { id: "forest-scarf", label: "토끼 목도리 색", regions: [{ x: 0.23, y: 0.66, radius: 0.075 }] },
      {
        id: "forest-glow-mushrooms",
        label: "빛나는 버섯 색",
        regions: [
          { x: 0.08, y: 0.84, radius: 0.1 },
          { x: 0.91, y: 0.82, radius: 0.1 },
        ],
      },
    ],
  },
  {
    id: "underwater-treasure",
    differences: [
      { id: "underwater-jellyfish", label: "해파리 색", regions: [{ x: 0.34, y: 0.19, radius: 0.12 }] },
      { id: "underwater-chest", label: "보물상자 열림", regions: [{ x: 0.27, y: 0.76, radius: 0.16 }] },
      { id: "underwater-fish", label: "노란 물고기 수", regions: [{ x: 0.78, y: 0.62, radius: 0.17 }] },
    ],
  },
] as const;

export function shuffledGamePuzzles(): MatchPuzzle[] {
  return [...GAME_PUZZLES]
    .map((puzzle) => ({ puzzle, order: Math.random() }))
    .sort((left, right) => left.order - right.order)
    .map(({ puzzle }) => structuredClone(puzzle));
}
