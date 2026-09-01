import type { GamePuzzleId } from "./puzzle-asset-manifest.js";

export {
  GAME_PUZZLE_ASSET_MANIFEST,
  GAME_PUZZLE_IDS,
  type GamePuzzleId,
  type PuzzleAssetFileMetadata,
  type PuzzleAssetMetadata,
  type PuzzleDifficulty,
  type PuzzleRightsStatus,
} from "./puzzle-asset-manifest.js";

export const GAME_CONFIG = {
  differenceScore: 10,
  remainingTimeScorePerSecond: 0.5,
  countdownSeconds: 3,
  readyTimeoutSeconds: 30,
  preloadTimeoutSeconds: 15,
  reconnectGraceSeconds: 10,
} as const;

export const GAME_MODES = ["STANDARD", "SPRINT", "SURVIVAL"] as const;
export type GameMode = (typeof GAME_MODES)[number];
export const GAME_DIFFICULTIES = ["EASY", "NORMAL", "HARD"] as const;
export type GameDifficulty = (typeof GAME_DIFFICULTIES)[number];

export interface MatchSettings {
  mode: GameMode;
  difficulty: GameDifficulty;
}

export const DEFAULT_MATCH_SETTINGS: MatchSettings = { mode: "STANDARD", difficulty: "NORMAL" };

export const GAME_MODE_RULES = {
  STANDARD: { durationSeconds: 180, wrongAnswerLimit: null },
  SPRINT: { durationSeconds: 60, wrongAnswerLimit: null },
  SURVIVAL: { durationSeconds: 120, wrongAnswerLimit: 3 },
} as const;

export const GAME_DIFFICULTY_RULES = {
  EASY: { hitRadiusMultiplier: 1.25, wrongAnswerLockSeconds: 0.5 },
  NORMAL: { hitRadiusMultiplier: 1, wrongAnswerLockSeconds: 1 },
  HARD: { hitRadiusMultiplier: 0.8, wrongAnswerLockSeconds: 2 },
} as const;

export type GameState =
  | "LOBBY"
  | "MATCHING"
  | "READY"
  | "PRELOADING"
  | "COUNTDOWN"
  | "PLAYING"
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
  currentDifferenceCount: number;
  totalFoundCount: number;
  totalDifferenceCount: number;
  completedAllPuzzles: boolean;
  score: number;
  timeBonus: number;
  connectionStatus: "CONNECTED" | "RECONNECTING" | "FORFEITED";
  perspective: "SELF" | "OPPONENT";
  correctStreak?: number;
  bestStreak?: number;
  /** Present only for the player receiving this snapshot. */
  puzzleIndex?: number;
  /** Present only for the player receiving this snapshot. */
  wrongAnswerCount?: number;
  /** Present only for the player receiving this snapshot. */
  inputLockedUntilMs?: number | null;
}

export interface SelfPlayerProgress extends PlayerProgress {
  perspective: "SELF";
  puzzleIndex: number;
  wrongAnswerCount: number;
  inputLockedUntilMs: number | null;
}

export interface OpponentPlayerProgress extends PlayerProgress {
  perspective: "OPPONENT";
}

export type GameEndReason = "COMPLETED" | "TIMEOUT" | "FORFEIT" | "MISTAKE_LIMIT" | "CANCELLED";
export type ReportReason = "UNFAIR" | "INAPPROPRIATE" | "SYSTEM_ERROR" | "OTHER";

export interface GameSnapshot {
  matchId: string;
  state: GameState;
  stateVersion: number;
  settings?: MatchSettings;
  currentPuzzleId: GamePuzzleId | null;
  currentPuzzleVersion: string | null;
  nextPuzzleId: GamePuzzleId | null;
  nextPuzzleVersion: string | null;
  totalPuzzleCount: number;
  totalDifferenceCount: number;
  deadlineMs: number | null;
  players: [PlayerProgress, PlayerProgress];
  winnerId: string | null;
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
  correctStreak: number;
  bestStreak: number;
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
  "game:error": (payload: GameErrorPayload) => void;
  "game:report-result": (payload: ReportResultPayload) => void;
}

export interface ClientToServerEvents {
  "queue:join": (payload: { nickname: string; settings?: MatchSettings }) => void;
  "queue:leave": () => void;
  "game:ready": (payload: { matchId: string }) => void;
  "game:loaded": (payload: { matchId: string; puzzleId: GamePuzzleId; puzzleVersion: string }) => void;
  "game:guess": (payload: GameActionContext & {
    matchId: string;
    puzzleId: GamePuzzleId;
    point: NormalizedPoint;
  }) => void;
  "game:forfeit": (payload: GameActionContext & { matchId: string }) => void;
  "game:report": (payload: GameActionContext & {
    matchId: string;
    reason: ReportReason;
    details?: string;
  }) => void;
}
