export const GAME_CONFIG = {
  differenceCount: 3,
  findingDurationSeconds: 60,
  wrongAnswerPenaltySeconds: 3,
  hintsPerGame: 1,
  reconnectGraceSeconds: 10,
} as const;

/**
 * 서버와 웹이 공통으로 아는 장면 식별자다.
 * 실제 이미지와 객체 마스크는 웹의 장면 카탈로그에서 관리한다.
 */
export const GAME_SCENE_IDS = [
  "prototype-room",
  "cartoon-laboratory",
  "cozy-cafe",
  "enchanted-forest",
  "cyber-city",
  "underwater-treasure",
] as const;
export type GameSceneId = (typeof GAME_SCENE_IDS)[number];
export const DEFAULT_GAME_SCENE_ID: GameSceneId = GAME_SCENE_IDS[0];

/**
 * 서버가 제출된 객체 편집을 독립적으로 검증하기 위한 장면별 허용 객체 ID.
 * 웹의 실제 마스크 카탈로그는 이 목록과 정확히 일치해야 한다.
 */
export const GAME_SCENE_OBJECT_IDS = {
  "prototype-room": [
    "plant",
    "lamp",
    "sofa",
    "pillow",
    "window",
    "left-curtain",
    "right-curtain",
    "cloud",
    "clock",
    "picture",
    "vase",
    "books",
    "rug",
    "cabinet",
    "cat",
    "ball",
  ],
  "cartoon-laboratory": [
    "robot-arm",
    "laser",
    "upper-microscope",
    "large-flask",
    "pipette",
    "lab-clock",
    "desk-lamp",
    "lower-microscope",
    "upper-plant",
    "binders",
    "books",
    "monitor",
    "green-flask",
    "test-tubes",
    "lower-plant",
    "goggles",
    "toolbox",
    "bottles",
  ],
  "cozy-cafe": [
    "cafe-left-pendant", "cafe-center-pendant", "cafe-small-pendant",
    "cafe-clock", "cafe-wall-books", "cafe-counter-plant", "cafe-cake",
    "cafe-macarons", "cafe-croissants", "cafe-covered-pastries",
    "cafe-display-case", "cafe-cat", "cafe-roses", "cafe-window-vines",
    "cafe-coffee-cup",
  ],
  "enchanted-forest": [
    "forest-main-house", "forest-chimney", "forest-sun", "forest-rabbit",
    "forest-scarf", "forest-bird", "forest-bench", "forest-bridge",
    "forest-stream", "forest-left-glow-mushrooms",
    "forest-right-glow-mushrooms", "forest-right-house", "forest-tree-door",
    "forest-red-mushroom", "forest-flowers",
  ],
  "cyber-city": [
    "city-dragon-sign", "city-cyber-ramen-sign", "city-left-pink-sign",
    "city-ramen-sign", "city-tech-sign", "city-headphone-person",
    "city-food-stall", "city-chef", "city-large-umbrella",
    "city-cyan-coat-person", "city-right-man", "city-bollard",
    "city-road-reflection", "city-tower-screen", "city-overhead-cables",
  ],
  "underwater-treasure": [
    "underwater-turtle", "underwater-jellyfish", "underwater-chest",
    "underwater-starfish", "underwater-left-blue-fish",
    "underwater-yellow-school", "underwater-striped-fish",
    "underwater-clownfish", "underwater-left-coral", "underwater-right-coral",
    "underwater-shell", "underwater-rocks", "underwater-bubbles",
    "underwater-left-seaweed", "underwater-right-seaweed",
  ],
} as const satisfies Record<GameSceneId, readonly string[]>;

/**
 * 제작자가 렌더한 문제 이미지의 허용 조건.
 * 서버는 픽셀을 해석하지 않고 형식과 크기만 검증한다.
 */
export const PROBLEM_IMAGE_LIMITS = {
  allowedPrefixes: ["data:image/png;base64,"],
  maxBytes: 3 * 1024 * 1024,
} as const;

export type GameState =
  | "LOBBY"
  | "MATCHING"
  | "READY"
  | "FINDING"
  | "FINISHED"
  | "CANCELLED";

export type DifferenceKind = "ADD" | "COVER" | "COLOR" | "DRAW";

export interface NormalizedPoint {
  x: number;
  y: number;
}

export interface AnswerRegion extends NormalizedPoint {
  radius: number;
}

export interface DifferenceStroke {
  points: NormalizedPoint[];
  color: string;
  width: number;
  tool: "PENCIL" | "ERASER";
}

export interface DifferenceFill {
  seed: NormalizedPoint;
  color: string;
  tolerance: number;
}

export const OBJECT_SHAPE_EFFECTS = [
  "NONE",
  "WIDE",
  "TALL",
  "STRIPES",
  "DOTS",
  "STAR",
  "OUTLINE",
] as const;
export type ObjectShapeEffect = (typeof OBJECT_SHAPE_EFFECTS)[number];

export interface DifferenceObjectEdit {
  /** UI에 정의된 고정 오브젝트 ID. 래스터 이미지에서 객체별 선택 범위를 안정적으로 유지한다. */
  objectId: string;
  objectLabel: string;
  color: string;
  shapeEffect: ObjectShapeEffect;
}

export interface Difference {
  id: string;
  kind: DifferenceKind;
  region: AnswerRegion;
  strokes?: DifferenceStroke[];
  fill?: DifferenceFill;
  objectEdit?: DifferenceObjectEdit;
}

/** 시스템이 장면별로 제공하는 고정 오류. 좌우 보드는 같은 정규화 좌표를 공유한다. */
export const SYSTEM_SCENE_DIFFERENCES = {
  "prototype-room": [
    { id: "clock", kind: "COLOR", region: { x: 0.76, y: 0.20, radius: 0.055 }, objectEdit: { objectId: "clock", objectLabel: "시계", color: "#ef4444", shapeEffect: "STRIPES" } },
    { id: "ball", kind: "COLOR", region: { x: 0.647, y: 0.895, radius: 0.042 }, objectEdit: { objectId: "ball", objectLabel: "공", color: "#22c55e", shapeEffect: "STAR" } },
    { id: "cloud", kind: "COLOR", region: { x: 0.555, y: 0.17, radius: 0.045 }, objectEdit: { objectId: "cloud", objectLabel: "구름", color: "#8b5cf6", shapeEffect: "DOTS" } },
  ],
  "cartoon-laboratory": [
    { id: "lab-clock", kind: "COLOR", region: { x: 0.75, y: 0.18, radius: 0.055 }, objectEdit: { objectId: "lab-clock", objectLabel: "연구실 시계", color: "#ef4444", shapeEffect: "STRIPES" } },
    { id: "test-tubes", kind: "COLOR", region: { x: 0.37, y: 0.84, radius: 0.05 }, objectEdit: { objectId: "test-tubes", objectLabel: "시험관 묶음", color: "#f59e0b", shapeEffect: "DOTS" } },
    { id: "toolbox", kind: "COLOR", region: { x: 0.89, y: 0.80, radius: 0.06 }, objectEdit: { objectId: "toolbox", objectLabel: "공구함", color: "#22c55e", shapeEffect: "STAR" } },
  ],
  "cozy-cafe": [
    { id: "cafe-left-pendant", kind: "COLOR", region: { x: 0.095, y: 0.13, radius: 0.045 }, objectEdit: { objectId: "cafe-left-pendant", objectLabel: "왼쪽 펜던트 조명", color: "#8b5cf6", shapeEffect: "STRIPES" } },
    { id: "cafe-clock", kind: "COLOR", region: { x: 0.65, y: 0.21, radius: 0.055 }, objectEdit: { objectId: "cafe-clock", objectLabel: "벽시계", color: "#ef4444", shapeEffect: "DOTS" } },
    { id: "cafe-cake", kind: "COLOR", region: { x: 0.46, y: 0.53, radius: 0.05 }, objectEdit: { objectId: "cafe-cake", objectLabel: "딸기 케이크", color: "#3b82f6", shapeEffect: "STAR" } },
  ],
  "enchanted-forest": [
    { id: "forest-chimney", kind: "COLOR", region: { x: 0.27, y: 0.25, radius: 0.04 }, objectEdit: { objectId: "forest-chimney", objectLabel: "굴뚝", color: "#3b82f6", shapeEffect: "STRIPES" } },
    { id: "forest-sun", kind: "COLOR", region: { x: 0.68, y: 0.12, radius: 0.055 }, objectEdit: { objectId: "forest-sun", objectLabel: "해", color: "#8b5cf6", shapeEffect: "DOTS" } },
    { id: "forest-scarf", kind: "COLOR", region: { x: 0.18, y: 0.75, radius: 0.038 }, objectEdit: { objectId: "forest-scarf", objectLabel: "토끼 목도리", color: "#22c55e", shapeEffect: "STAR" } },
  ],
  "cyber-city": [
    { id: "city-dragon-sign", kind: "COLOR", region: { x: 0.28, y: 0.17, radius: 0.055 }, objectEdit: { objectId: "city-dragon-sign", objectLabel: "용 네온사인", color: "#f59e0b", shapeEffect: "STRIPES" } },
    { id: "city-tech-sign", kind: "COLOR", region: { x: 0.96, y: 0.52, radius: 0.05 }, objectEdit: { objectId: "city-tech-sign", objectLabel: "오른쪽 테크 간판", color: "#ef4444", shapeEffect: "DOTS" } },
    { id: "city-headphone-person", kind: "COLOR", region: { x: 0.20, y: 0.72, radius: 0.06 }, objectEdit: { objectId: "city-headphone-person", objectLabel: "헤드폰을 쓴 사람", color: "#22c55e", shapeEffect: "STAR" } },
  ],
  "underwater-treasure": [
    { id: "underwater-jellyfish", kind: "COLOR", region: { x: 0.34, y: 0.20, radius: 0.065 }, objectEdit: { objectId: "underwater-jellyfish", objectLabel: "빛나는 해파리", color: "#ef4444", shapeEffect: "STRIPES" } },
    { id: "underwater-chest", kind: "COLOR", region: { x: 0.27, y: 0.77, radius: 0.075 }, objectEdit: { objectId: "underwater-chest", objectLabel: "보물상자", color: "#3b82f6", shapeEffect: "DOTS" } },
    { id: "underwater-starfish", kind: "COLOR", region: { x: 0.10, y: 0.56, radius: 0.045 }, objectEdit: { objectId: "underwater-starfish", objectLabel: "불가사리", color: "#22c55e", shapeEffect: "STAR" } },
  ],
} as const satisfies Record<GameSceneId, readonly Difference[]>;

export function getSystemSceneDifferences(sceneId: GameSceneId): Difference[] {
  return SYSTEM_SCENE_DIFFERENCES[sceneId].map((difference) =>
    structuredClone(difference),
  ) as Difference[];
}

/** 이미 찾은 차이점만 표시용으로 되돌려준다. 미발견 정답은 포함하지 않는다. */
export interface FoundMark {
  differenceId: string;
  region: AnswerRegion;
}

/** 경기가 끝난 뒤에만 공개하는 전체 정답 */
export interface RevealedDifference {
  id: string;
  kind: DifferenceKind;
  region: AnswerRegion;
  found: boolean;
}

export interface PlayerResult {
  playerId: string;
  foundCount: number;
  wrongAnswerCount: number;
  lastCorrectAtMs: number | null;
}

export interface MatchFoundPayload {
  matchId: string;
  playerId: string;
  opponentNickname: string;
}

export interface PlayerProgress {
  playerId: string;
  nickname: string;
  ready: boolean;
  foundCount: number;
  wrongAnswerCount: number;
  hintsRemaining: number;
  connectionStatus: "CONNECTED" | "RECONNECTING" | "FORFEITED";
}

export type GameEndReason = "COMPLETED" | "TIMEOUT" | "FORFEIT" | "CANCELLED";
export type ReportReason = "UNFAIR" | "INAPPROPRIATE" | "SYSTEM_ERROR" | "OTHER";

export interface GameSnapshot {
  matchId: string;
  state: GameState;
  stateVersion: number;
  imageId: GameSceneId;
  deadlineMs: number | null;
  players: [PlayerProgress, PlayerProgress];
  winnerId: string | null;
  myFoundIds: string[];
  /** 내가 이미 맞힌 차이점의 위치. 재접속 시 표시를 복원하는 용도. */
  foundMarks: FoundMark[];
  /** FINISHED에서만 채워지는 전체 정답 공개 */
  revealedDifferences: RevealedDifference[] | null;
  endReason: GameEndReason | null;
  cancelReason: string | null;
}

export interface SessionReadyPayload {
  guestToken: string;
  playerId: string;
}

export interface GuessResult {
  correct: boolean;
  differenceId: string | null;
  /** 맞혔을 때만 그 차이점의 위치를 돌려준다. 오답이면 null. */
  region: AnswerRegion | null;
  remainingTimeMs: number;
}

export interface HintResult {
  area: AnswerRegion;
  remaining: number;
}

export interface GameErrorPayload {
  code: string;
  message: string;
}

export interface ReportResultPayload {
  reportId: string;
}

export interface GameActionContext {
  expectedState: GameState;
  expectedStateVersion: number;
}

export interface ServerToClientEvents {
  "session:ready": (payload: SessionReadyPayload) => void;
  "match:found": (payload: MatchFoundPayload) => void;
  "queue:left": () => void;
  "game:snapshot": (payload: GameSnapshot) => void;
  "game:guess-result": (payload: GuessResult) => void;
  "game:hint-result": (payload: HintResult) => void;
  "game:error": (payload: GameErrorPayload) => void;
  "game:report-result": (payload: ReportResultPayload) => void;
}

export interface ClientToServerEvents {
  "queue:join": (payload: { nickname: string }) => void;
  "queue:leave": () => void;
  "game:ready": (payload: { matchId: string }) => void;
  "game:guess": (payload: GameActionContext & { matchId: string; point: NormalizedPoint }) => void;
  "game:hint": (payload: GameActionContext & { matchId: string }) => void;
  "game:forfeit": (payload: GameActionContext & { matchId: string }) => void;
  "game:report": (payload: GameActionContext & {
    matchId: string;
    reason: ReportReason;
    details?: string;
  }) => void;
}
