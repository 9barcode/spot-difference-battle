import type { MatchPuzzle } from "@spot-battle/game-core";

export const GAME_PUZZLES: readonly MatchPuzzle[] = [
  {
    id: "enchanted-forest",
    differences: [
      { id: "forest-smoke", label: "굴뚝 연기", regions: [{ x: 0.31, y: 0.13, radius: 0.11 }] },
      { id: "forest-scarf", label: "토끼 목도리 색", regions: [{ x: 0.23, y: 0.66, radius: 0.075 }] },
      { id: "forest-glow-mushrooms", label: "빛나는 버섯 색", regions: [{ x: 0.1, y: 0.84, radius: 0.1 }] },
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

// The forest asset currently contains unregistered visual differences (the
// right mushroom cluster and the bench bird). Keep its definition available
// for repair and explicit QA, but never include it in normal matchmaking.
export const ACTIVE_GAME_PUZZLES: readonly MatchPuzzle[] = GAME_PUZZLES.filter(
  (puzzle) => puzzle.id !== "enchanted-forest",
);

export function shuffledGamePuzzles(): MatchPuzzle[] {
  return [...ACTIVE_GAME_PUZZLES]
    .map((puzzle) => ({ puzzle, order: Math.random() }))
    .sort((left, right) => left.order - right.order)
    .map(({ puzzle }) => structuredClone(puzzle));
}