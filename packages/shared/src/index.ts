export const GAME_CONFIG = {
  differenceCount: 3,
  editingDurationSeconds: 30,
  findingDurationSeconds: 60,
  wrongAnswerPenaltySeconds: 3,
  hintsPerGame: 1,
  reconnectGraceSeconds: 10,
} as const;

export type GameState =
  | "LOBBY"
  | "MATCHING"
  | "READY"
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

export interface Difference {
  id: string;
  kind: DifferenceKind;
  region: AnswerRegion;
  strokes?: DifferenceStroke[];
  fill?: DifferenceFill;
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
  submitted: boolean;
  foundCount: number;
  wrongAnswerCount: number;
  hintsRemaining: number;
  connectionStatus: "CONNECTED" | "RECONNECTING" | "FORFEITED";
}

export type GameEndReason = "COMPLETED" | "TIMEOUT" | "FORFEIT" | "CANCELLED";

export interface GameSnapshot {
  matchId: string;
  state: GameState;
  stateVersion: number;
  imageId: string;
  deadlineMs: number | null;
  players: [PlayerProgress, PlayerProgress];
  winnerId: string | null;
  problem: Difference[] | null;
  myFoundIds: string[];
  endReason: GameEndReason | null;
}

export interface SessionReadyPayload {
  guestToken: string;
  playerId: string;
}

export interface GuessResult {
  correct: boolean;
  differenceId: string | null;
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

export interface ServerToClientEvents {
  "session:ready": (payload: SessionReadyPayload) => void;
  "match:found": (payload: MatchFoundPayload) => void;
  "queue:left": () => void;
  "game:snapshot": (payload: GameSnapshot) => void;
  "game:guess-result": (payload: GuessResult) => void;
  "game:hint-result": (payload: HintResult) => void;
  "game:error": (payload: GameErrorPayload) => void;
}

export interface ClientToServerEvents {
  "queue:join": (payload: { nickname: string }) => void;
  "queue:leave": () => void;
  "game:ready": (payload: { matchId: string }) => void;
  "game:submit": (payload: { matchId: string; differences: Difference[] }) => void;
  "game:guess": (payload: { matchId: string; point: NormalizedPoint }) => void;
  "game:hint": (payload: { matchId: string }) => void;
  "game:forfeit": (payload: { matchId: string }) => void;
}
