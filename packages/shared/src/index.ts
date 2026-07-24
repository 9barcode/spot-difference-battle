export const GAME_CONFIG = {
  differenceCount: 3,
  editingDurationSeconds: 30,
  findingDurationSeconds: 60,
  wrongAnswerPenaltySeconds: 3,
  hintsPerGame: 1,
  reconnectGraceSeconds: 10,
  /** 제작 마감 몇 초 전에 클라이언트가 자동 보충 후 제출할지 */
  autoSubmitLeadSeconds: 3,
} as const;

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

export type ObjectShapeEffect = "NONE" | "WIDE" | "TALL" | "STRIPES" | "DOTS" | "STAR" | "OUTLINE";

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
  submitted: boolean;
  /** 마감 임박으로 클라이언트가 자동 보충해 제출했는지 */
  autoFilled: boolean;
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
  correct: boolean;
  differenceId: string | null;
  /** 맞혔을 때만 그 차이점의 위치를 돌려준다. 오답이면 null. */
  region: AnswerRegion | null;
  remainingTimeMs: number;
  /** 마감·자동보충 등으로 제출이 자동 처리됐는지 */
  autoFilled?: boolean;
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
  "game:guess": (payload: GameActionContext & { matchId: string; point: NormalizedPoint }) => void;
  "game:hint": (payload: GameActionContext & { matchId: string }) => void;
  "game:forfeit": (payload: GameActionContext & { matchId: string }) => void;
  "game:report": (payload: GameActionContext & {
    matchId: string;
    reason: ReportReason;
    details?: string;
  }) => void;
}
