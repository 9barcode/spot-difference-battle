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

export type DifferenceKind = "ADD" | "COVER" | "COLOR";

export interface NormalizedPoint {
  x: number;
  y: number;
}

export interface AnswerRegion extends NormalizedPoint {
  radius: number;
}

export interface Difference {
  id: string;
  kind: DifferenceKind;
  region: AnswerRegion;
}

export interface PlayerResult {
  playerId: string;
  foundCount: number;
  wrongAnswerCount: number;
  lastCorrectAtMs: number | null;
}

export interface MatchFoundPayload {
  matchId: string;
  opponentNickname: string;
}

export interface ServerToClientEvents {
  "match:found": (payload: MatchFoundPayload) => void;
  "queue:left": () => void;
}

export interface ClientToServerEvents {
  "queue:join": (payload: { nickname: string }) => void;
  "queue:leave": () => void;
}

