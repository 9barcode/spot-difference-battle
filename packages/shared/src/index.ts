export const GAME_CONFIG = {
  differenceCount: 3,
  gameDurationSeconds: 180,
  countdownSeconds: 3,
  readyTimeoutSeconds: 30,
  preloadTimeoutSeconds: 15,
  wrongAnswerLockSeconds: 1,
  reconnectGraceSeconds: 10,
} as const;

export const GAME_PUZZLE_IDS = ["enchanted-forest", "underwater-treasure"] as const;
export type GamePuzzleId = (typeof GAME_PUZZLE_IDS)[number];

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
  | "PRELOADING"
  | "COUNTDOWN"
  | "PLAYING"
  | "EDITING"
  | "SWAPPING"
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

/**
 * 제작자가 렌더해 서버로 올리는 문제.
 * `differences`는 서버 밖으로 나가지 않고, `renderedImage`만 상대에게 전달된다.
 */
export interface ProblemSubmission {
  differences: Difference[];
  renderedImage: string;
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
  loaded: boolean;
  completedPuzzleCount: number;
  foundCount: number;
  connectionStatus: "CONNECTED" | "RECONNECTING" | "FORFEITED";
  perspective: "SELF" | "OPPONENT";
  /** Present only for the player receiving this snapshot. */
  puzzleIndex?: number;
  /** Present only for the player receiving this snapshot. */
  totalFoundCount?: number;
  /** Present only for the player receiving this snapshot. */
  wrongAnswerCount?: number;
  /** Present only for the player receiving this snapshot. */
  inputLockedUntilMs?: number | null;
}

export interface SelfPlayerProgress extends PlayerProgress {
  perspective: "SELF";
  puzzleIndex: number;
  totalFoundCount: number;
  wrongAnswerCount: number;
  inputLockedUntilMs: number | null;
}

export interface OpponentPlayerProgress extends PlayerProgress {
  perspective: "OPPONENT";
}

export type GameEndReason = "COMPLETED" | "TIMEOUT" | "FORFEIT" | "CANCELLED";
export type ReportReason = "UNFAIR" | "INAPPROPRIATE" | "SYSTEM_ERROR" | "OTHER";

export interface GameSnapshot {
  matchId: string;
  state: GameState;
  stateVersion: number;
  imageId: GameSceneId;
  currentPuzzleId: GamePuzzleId | null;
  nextPuzzleId: GamePuzzleId | null;
  totalPuzzleCount: number;
  deadlineMs: number | null;
  players: [PlayerProgress, PlayerProgress];
  winnerId: string | null;
  /**
   * 제작자가 렌더해 제출한 문제 이미지. FINDING·FINISHED에서만 채워진다.
   * 제작 명령(strokes/fill)과 정답 좌표는 절대 포함하지 않는다.
   */
  problemImage: string | null;
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
  outcome: "CORRECT" | "DUPLICATE" | "WRONG";
  correct: boolean;
  differenceId: string | null;
  /** 맞혔을 때만 그 차이점의 위치를 돌려준다. 오답이면 null. */
  region: AnswerRegion | null;
  remainingTimeMs: number;
  puzzleCompleted: boolean;
  matchFinished: boolean;
  inputLockedUntilMs: number | null;
  currentPuzzleId: GamePuzzleId | null;
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
  "game:loaded": (payload: { matchId: string; puzzleId: GamePuzzleId }) => void;
  "game:submit": (
    payload: GameActionContext & {
      matchId: string;
      differences: Difference[];
      /** 제작자가 직접 렌더한 문제 이미지. 서버는 이것만 상대에게 전달한다. */
      renderedImage: string;
      /** 제한시간 마감으로 클라이언트가 자동 보충해 제출한 경우 true */
      autoFilled?: boolean;
    },
  ) => void;
  "game:guess": (payload: GameActionContext & {
    matchId: string;
    puzzleId: GamePuzzleId;
    point: NormalizedPoint;
  }) => void;
  "game:hint": (payload: GameActionContext & { matchId: string }) => void;
  "game:forfeit": (payload: GameActionContext & { matchId: string }) => void;
  "game:report": (payload: GameActionContext & {
    matchId: string;
    reason: ReportReason;
    details?: string;
  }) => void;
}
