import type { MatchPuzzle } from "@spot-battle/game-core";
import {
  DEFAULT_MATCH_SETTINGS,
  GAME_PUZZLE_ASSET_MANIFEST,
  type GameDifficulty,
  type PuzzleDifficulty,
} from "@spot-battle/shared";

export const GAME_PUZZLES: readonly MatchPuzzle[] = [
  {
    id: "cozy-cafe",
    assetVersion: GAME_PUZZLE_ASSET_MANIFEST["cozy-cafe"].version,
    differences: [
      { id: "cafe-clock-hands", label: "벽시계 바늘", regions: [{ x: 0.075, y: 0.13, radius: 0.065 }] },
      { id: "cafe-bouquet", label: "테이블 꽃", regions: [{ x: 0.485, y: 0.51, radius: 0.13 }] },
      { id: "cafe-cat", label: "의자 위 고양이", regions: [{ x: 0.84, y: 0.79, radius: 0.13 }] },
    ],
  },
  {
    id: "enchanted-forest",
    assetVersion: GAME_PUZZLE_ASSET_MANIFEST["enchanted-forest"].version,
    differences: [
      { id: "forest-lantern", label: "매달린 등불", regions: [{ x: 0.28, y: 0.39, radius: 0.12 }] },
      { id: "forest-scarf", label: "토끼 목도리", regions: [{ x: 0.18, y: 0.73, radius: 0.08 }] },
      { id: "forest-roof-bird", label: "나뭇가지의 새", regions: [{ x: 0.8, y: 0.12, radius: 0.06 }] },
    ],
  },
  {
    id: "underwater-treasure",
    assetVersion: GAME_PUZZLE_ASSET_MANIFEST["underwater-treasure"].version,
    differences: [
      { id: "underwater-turtle-hat", label: "거북이 모자", regions: [{ x: 0.39, y: 0.11, radius: 0.1 }] },
      { id: "underwater-jellyfish", label: "해파리 색", regions: [{ x: 0.8, y: 0.22, radius: 0.14 }] },
      { id: "underwater-chest", label: "보물상자", regions: [{ x: 0.5, y: 0.76, radius: 0.18 }] },
    ],
  },
  {
    id: "cyber-city",
    assetVersion: GAME_PUZZLE_ASSET_MANIFEST["cyber-city"].version,
    differences: [
      { id: "city-neon-sign", label: "대형 네온 간판", regions: [{ x: 0.17, y: 0.2, radius: 0.14 }] },
      { id: "city-flying-car", label: "하늘의 자동차", regions: [{ x: 0.68, y: 0.18, radius: 0.13 }] },
      { id: "city-headphones", label: "가운데 인물의 헤드폰", regions: [{ x: 0.52, y: 0.72, radius: 0.07 }] },
    ],
  },
  {
    id: "winter-cabin",
    assetVersion: GAME_PUZZLE_ASSET_MANIFEST["winter-cabin"].version,
    differences: [
      { id: "winter-chimney-smoke", label: "굴뚝 연기", regions: [{ x: 0.66, y: 0.12, radius: 0.1 }] },
      { id: "winter-snowman-hat", label: "눈사람 모자", regions: [{ x: 0.84, y: 0.6, radius: 0.11 }] },
      { id: "winter-campfire", label: "모닥불 색", regions: [{ x: 0.51, y: 0.78, radius: 0.13 }] },
    ],
  },
  {
    id: "space-station",
    assetVersion: GAME_PUZZLE_ASSET_MANIFEST["space-station"].version,
    differences: [
      { id: "space-suit", label: "우주복 색", regions: [{ x: 0.27, y: 0.33, radius: 0.17 }, { x: 0.23, y: 0.49, radius: 0.1 }] },
      { id: "space-planet", label: "창밖 행성", regions: [{ x: 0.74, y: 0.27, radius: 0.21 }] },
      { id: "space-console", label: "조종판 색", regions: [{ x: 0.51, y: 0.8, radius: 0.18 }] },
    ],
  },
  {
    id: "hawaiian-beach",
    assetVersion: GAME_PUZZLE_ASSET_MANIFEST["hawaiian-beach"].version,
    differences: [
      { id: "hawaii-umbrella", label: "해변 파라솔", regions: [{ x: 0.26, y: 0.56, radius: 0.17 }] },
      { id: "hawaii-surfboard", label: "서핑보드 색", regions: [{ x: 0.76, y: 0.75, radius: 0.17 }] },
      { id: "hawaii-parrot", label: "야자수 앵무새", regions: [{ x: 0.88, y: 0.31, radius: 0.1 }] },
    ],
  },
  {
    id: "alchemist-workshop",
    assetVersion: GAME_PUZZLE_ASSET_MANIFEST["alchemist-workshop"].version,
    differences: [
      { id: "alchemist-potion", label: "큰 물약 색", regions: [{ x: 0.17, y: 0.48, radius: 0.17 }] },
      { id: "alchemist-fire", label: "가마솥 불꽃", regions: [{ x: 0.51, y: 0.77, radius: 0.16 }] },
      { id: "alchemist-animal", label: "작업대 옆 동물", regions: [{ x: 0.84, y: 0.61, radius: 0.15 }] },
    ],
  },
  {
    id: "dinosaur-valley",
    assetVersion: GAME_PUZZLE_ASSET_MANIFEST["dinosaur-valley"].version,
    differences: [
      { id: "dino-volcano", label: "화산의 용암", regions: [{ x: 0.5, y: 0.28, radius: 0.15 }] },
      { id: "dino-color", label: "공룡 색", regions: [{ x: 0.32, y: 0.57, radius: 0.17 }, { x: 0.18, y: 0.59, radius: 0.1 }, { x: 0.38, y: 0.72, radius: 0.09 }] },
      { id: "dino-egg", label: "부화한 공룡알", regions: [{ x: 0.78, y: 0.8, radius: 0.18 }] },
    ],
  },
  {
    id: "pirate-ship",
    assetVersion: GAME_PUZZLE_ASSET_MANIFEST["pirate-ship"].version,
    differences: [
      { id: "pirate-flag", label: "해적 깃발", regions: [{ x: 0.49, y: 0.12, radius: 0.11 }] },
      { id: "pirate-headwear", label: "해적의 머리장식", regions: [{ x: 0.8, y: 0.4, radius: 0.11 }] },
      { id: "pirate-treasure", label: "갑판의 보물상자", regions: [{ x: 0.35, y: 0.87, radius: 0.13 }] },
    ],
  },
  {
    id: "japanese-shrine",
    assetVersion: GAME_PUZZLE_ASSET_MANIFEST["japanese-shrine"].version,
    differences: [
      { id: "shrine-blossoms", label: "벚꽃 색", regions: [{ x: 0.17, y: 0.1, radius: 0.09 }, { x: 0.06, y: 0.13, radius: 0.055 }, { x: 0.32, y: 0.08, radius: 0.075 }, { x: 0.48, y: 0.08, radius: 0.07 }] },
      { id: "shrine-torii", label: "도리이 색", regions: [{ x: 0.4, y: 0.3, radius: 0.15 }, { x: 0.58, y: 0.23, radius: 0.11 }, { x: 0.66, y: 0.39, radius: 0.09 }, { x: 0.35, y: 0.49, radius: 0.08 }] },
      { id: "shrine-mask", label: "인물의 여우 가면", regions: [{ x: 0.78, y: 0.69, radius: 0.07 }] },
    ],
  },
  {
    id: "korean-palace",
    assetVersion: GAME_PUZZLE_ASSET_MANIFEST["korean-palace"].version,
    differences: [
      { id: "palace-moon", label: "달 모양과 색", regions: [{ x: 0.78, y: 0.09, radius: 0.08 }] },
      { id: "palace-lights", label: "궁궐 조명 색", regions: [{ x: 0.52, y: 0.39, radius: 0.15 }, { x: 0.31, y: 0.45, radius: 0.08 }, { x: 0.72, y: 0.45, radius: 0.1 }, { x: 0.85, y: 0.48, radius: 0.07 }] },
      { id: "palace-fox-hat", label: "여우의 모자", regions: [{ x: 0.3, y: 0.72, radius: 0.09 }] },
    ],
  },
  {
    id: "medieval-castle",
    assetVersion: GAME_PUZZLE_ASSET_MANIFEST["medieval-castle"].version,
    differences: [
      { id: "castle-flag", label: "성의 깃발 색", regions: [{ x: 0.27, y: 0.08, radius: 0.07 }, { x: 0.4, y: 0.09, radius: 0.08 }] },
      { id: "castle-knight", label: "기사 갑옷 색", regions: [{ x: 0.68, y: 0.58, radius: 0.16 }, { x: 0.7, y: 0.41, radius: 0.08 }, { x: 0.72, y: 0.78, radius: 0.11 }, { x: 0.83, y: 0.62, radius: 0.08 }] },
      { id: "castle-chest", label: "보물상자", regions: [{ x: 0.32, y: 0.82, radius: 0.15 }] },
    ],
  },
  {
    id: "japanese-ninja",
    assetVersion: GAME_PUZZLE_ASSET_MANIFEST["japanese-ninja"].version,
    differences: [
      { id: "ninja-streamer", label: "잉어 깃발 색", regions: [{ x: 0.17, y: 0.08, radius: 0.07 }, { x: 0.29, y: 0.12, radius: 0.09 }, { x: 0.39, y: 0.16, radius: 0.07 }] },
      { id: "ninja-moon", label: "달 색", regions: [{ x: 0.76, y: 0.09, radius: 0.08 }] },
      { id: "ninja-scarf", label: "닌자 목도리 색", regions: [{ x: 0.56, y: 0.28, radius: 0.07 }] },
      { id: "ninja-sword", label: "지붕 위 검", regions: [{ x: 0.48, y: 0.75, radius: 0.13 }, { x: 0.32, y: 0.75, radius: 0.09 }, { x: 0.64, y: 0.7, radius: 0.08 }] },
      { id: "ninja-lantern", label: "등불 색", regions: [{ x: 0.88, y: 0.8, radius: 0.09 }] },
    ],
  },
  {
    id: "korean-goblin",
    assetVersion: GAME_PUZZLE_ASSET_MANIFEST["korean-goblin"].version,
    differences: [
      { id: "goblin-club", label: "도깨비 방망이", regions: [{ x: 0.23, y: 0.36, radius: 0.08 }, { x: 0.25, y: 0.23, radius: 0.065 }, { x: 0.3, y: 0.47, radius: 0.055 }] },
      { id: "goblin-flame", label: "도깨비불 색", regions: [{ x: 0.76, y: 0.1, radius: 0.08 }] },
      { id: "goblin-animal", label: "정원의 동물", regions: [{ x: 0.17, y: 0.55, radius: 0.08 }, { x: 0.13, y: 0.48, radius: 0.055 }, { x: 0.23, y: 0.62, radius: 0.07 }] },
      { id: "goblin-bag", label: "보따리 색", regions: [{ x: 0.15, y: 0.86, radius: 0.09 }, { x: 0.14, y: 0.95, radius: 0.045 }, { x: 0.08, y: 0.83, radius: 0.05 }] },
      { id: "goblin-statue", label: "석상 위 꽃", regions: [{ x: 0.87, y: 0.67, radius: 0.07 }, { x: 0.87, y: 0.76, radius: 0.055 }] },
    ],
  },
  {
    id: "medieval-dragon",
    assetVersion: GAME_PUZZLE_ASSET_MANIFEST["medieval-dragon"].version,
    differences: [
      { id: "dragon-window", label: "스테인드글라스의 용", regions: [{ x: 0.17, y: 0.2, radius: 0.11 }, { x: 0.17, y: 0.36, radius: 0.075 }] },
      { id: "dragon-chandelier", label: "샹들리에 불빛", regions: [{ x: 0.67, y: 0.08, radius: 0.07 }, { x: 0.54, y: 0.09, radius: 0.055 }, { x: 0.8, y: 0.09, radius: 0.055 }] },
      {
        id: "dragon-color",
        label: "잠든 용의 색",
        regions: [
          { x: 0.49, y: 0.67, radius: 0.12 },
          { x: 0.61, y: 0.57, radius: 0.16 },
          { x: 0.75, y: 0.54, radius: 0.15 },
          { x: 0.79, y: 0.68, radius: 0.13 },
          { x: 0.64, y: 0.78, radius: 0.12 },
        ],
      },
      { id: "dragon-sword", label: "바위에 꽂힌 검", regions: [{ x: 0.19, y: 0.75, radius: 0.1 }, { x: 0.15, y: 0.61, radius: 0.06 }, { x: 0.22, y: 0.88, radius: 0.07 }] },
      { id: "dragon-book", label: "마법책 색", regions: [{ x: 0.34, y: 0.48, radius: 0.08 }, { x: 0.41, y: 0.48, radius: 0.055 }, { x: 0.27, y: 0.47, radius: 0.055 }] },
    ],
  },
  {
    id: "home-office",
    assetVersion: GAME_PUZZLE_ASSET_MANIFEST["home-office"].version,
    differences: [
      { id: "office-wall-decor", label: "벽시계와 액자", regions: [{ x: 0.56, y: 0.16, radius: 0.14 }] },
      { id: "office-mug", label: "책상 위 머그컵", regions: [{ x: 0.24, y: 0.66, radius: 0.09 }] },
      { id: "office-notebook", label: "노트 색", regions: [{ x: 0.84, y: 0.72, radius: 0.12 }] },
    ],
  },
  {
    id: "farmers-market",
    assetVersion: GAME_PUZZLE_ASSET_MANIFEST["farmers-market"].version,
    differences: [
      { id: "market-flowers", label: "꽃 종류", regions: [{ x: 0.14, y: 0.37, radius: 0.11 }] },
      { id: "market-fruit", label: "왼쪽 과일", regions: [{ x: 0.21, y: 0.64, radius: 0.16 }] },
      { id: "market-tote", label: "오른쪽 천가방", regions: [{ x: 0.91, y: 0.57, radius: 0.09 }] },
    ],
  },
  {
    id: "bathroom-vanity",
    assetVersion: GAME_PUZZLE_ASSET_MANIFEST["bathroom-vanity"].version,
    differences: [
      { id: "bathroom-succulent", label: "세면대 왼쪽 화분", regions: [{ x: 0.285, y: 0.39, radius: 0.06 }] },
      { id: "bathroom-candle", label: "세면대 왼쪽 촛불", regions: [{ x: 0.4, y: 0.42, radius: 0.04 }] },
      { id: "bathroom-wall-towel", label: "벽걸이 수건 색", regions: [{ x: 0.9, y: 0.3, radius: 0.1 }] },
    ],
  },
  {
    id: "lakeside-picnic",
    assetVersion: GAME_PUZZLE_ASSET_MANIFEST["lakeside-picnic"].version,
    differences: [
      { id: "picnic-lantern", label: "랜턴 색", regions: [{ x: 0.24, y: 0.49, radius: 0.07 }] },
      { id: "picnic-mug", label: "테이블 위 머그컵", regions: [{ x: 0.35, y: 0.54, radius: 0.04 }] },
      { id: "picnic-bag", label: "나무 옆 가방", regions: [{ x: 0.87, y: 0.73, radius: 0.13 }] },
    ],
  },
  {
    id: "laundry-room",
    assetVersion: GAME_PUZZLE_ASSET_MANIFEST["laundry-room"].version,
    differences: [
      { id: "laundry-detergent", label: "파란 세제통", regions: [{ x: 0.34, y: 0.14, radius: 0.065 }] },
      { id: "laundry-shirt", label: "걸린 티셔츠", regions: [{ x: 0.83, y: 0.3, radius: 0.11 }] },
      { id: "laundry-ironing-board", label: "다리미판 색", regions: [{ x: 0.78, y: 0.51, radius: 0.09 }] },
    ],
  },
] as const;

export const ACTIVE_GAME_PUZZLES: readonly MatchPuzzle[] = GAME_PUZZLES;

const ASSET_DIFFICULTY_BY_MATCH = {
  EASY: "EASY",
  NORMAL: "MEDIUM",
  HARD: "HARD",
} as const satisfies Record<GameDifficulty, Exclude<PuzzleDifficulty, "UNRATED">>;

export function gamePuzzlesForDifficulty(difficulty: GameDifficulty): MatchPuzzle[] {
  const targetDifficulty = ASSET_DIFFICULTY_BY_MATCH[difficulty];
  return ACTIVE_GAME_PUZZLES.filter((puzzle) => {
    const metadata = GAME_PUZZLE_ASSET_MANIFEST[puzzle.id as keyof typeof GAME_PUZZLE_ASSET_MANIFEST];
    return metadata !== undefined && (metadata.difficulty === "UNRATED" || metadata.difficulty === targetDifficulty);
  }).map((puzzle) => structuredClone(puzzle));
}

export function shuffledGamePuzzles(difficulty: GameDifficulty = DEFAULT_MATCH_SETTINGS.difficulty): MatchPuzzle[] {
  return gamePuzzlesForDifficulty(difficulty)
    .map((puzzle) => ({ puzzle, order: Math.random() }))
    .sort((left, right) => left.order - right.order)
    .map(({ puzzle }) => puzzle);
}
