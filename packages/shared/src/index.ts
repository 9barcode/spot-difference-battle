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
export type ReportReason = "UNFAIR" | "INAPPROPRIATE" | "SYSTEM_ERROR" | "OTHER";

export interface GameSnapshot {
  matchId: string;
  state: GameState;
  stateVersion: number;
  imageId: string;
  deadlineMs: number | null;
  players: [PlayerProgress, PlayerProgress];
  winnerId: string | null;
  problemImageDataUrl: string | null;
  myFoundIds: string[];
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
  actionId: string;
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
  "game:submit": (payload: GameActionContext & {
    matchId: string;
    differences: Difference[];
    problemImageDataUrl: string;
  }) => void;
  "game:guess": (payload: GameActionContext & { matchId: string; point: NormalizedPoint }) => void;
  "game:hint": (payload: GameActionContext & { matchId: string }) => void;
  "game:forfeit": (payload: GameActionContext & { matchId: string }) => void;
  "game:report": (payload: GameActionContext & {
    matchId: string;
    reason: ReportReason;
    details?: string;
  }) => void;
}
