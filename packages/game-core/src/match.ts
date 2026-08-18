import {
  GAME_CONFIG,
  getSystemSceneDifferences,
  type AnswerRegion,
  type Difference,
  type FoundMark,
  type GameSnapshot,
  type GameState,
  type GameEndReason,
  type GameSceneId,
  type GuessResult,
  type HintResult,
  type NormalizedPoint,
  type PlayerProgress,
  type RevealedDifference,
} from "@spot-battle/shared";
import {
  determineWinner,
  getRemainingTimeMs,
  isPointInAnswerRegion,
} from "./index.js";

export class GameRuleError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "GameRuleError";
  }
}

export interface MatchPlayer {
  playerId: string;
  nickname: string;
}

export interface PersistedMatchPlayer extends MatchPlayer {
  ready: boolean;
  foundIds: string[];
  wrongAnswerCount: number;
  hintsUsed: number;
  lastCorrectAtMs: number | null;
  connectionStatus: "CONNECTED" | "RECONNECTING" | "FORFEITED";
}

export interface PersistedMatchState {
  matchId: string;
  imageId: GameSceneId;
  state: GameState;
  stateVersion: number;
  deadlineMs: number | null;
  winnerId: string | null;
  endReason: GameEndReason | null;
  cancelReason: string | null;
  players: [PersistedMatchPlayer, PersistedMatchPlayer];
}

interface InternalPlayer extends MatchPlayer {
  ready: boolean;
  foundIds: Set<string>;
  wrongAnswerCount: number;
  hintsUsed: number;
  lastCorrectAtMs: number | null;
  connectionStatus: "CONNECTED" | "RECONNECTING" | "FORFEITED";
}

export class GameMatch {
  private state: GameState = "READY";
  private stateVersion = 1;
  private deadlineMs: number | null = null;
  private winnerId: string | null = null;
  private endReason: GameEndReason | null = null;
  private cancelReason: string | null = null;
  private players: [InternalPlayer, InternalPlayer];

  constructor(
    public readonly matchId: string,
    public readonly imageId: GameSceneId,
    players: [MatchPlayer, MatchPlayer],
  ) {
    if (players[0].playerId === players[1].playerId) {
      throw new GameRuleError("DUPLICATE_PLAYER", "서로 다른 두 플레이어가 필요합니다.");
    }

    this.players = players.map((player) => ({
      ...player,
      ready: false,
      foundIds: new Set<string>(),
      wrongAnswerCount: 0,
      hintsUsed: 0,
      lastCorrectAtMs: null,
      connectionStatus: "CONNECTED",
    })) as [InternalPlayer, InternalPlayer];
  }

  static restore(state: PersistedMatchState): GameMatch {
    const match = new GameMatch(
      state.matchId,
      state.imageId,
      state.players.map(({ playerId, nickname }) => ({ playerId, nickname })) as [
        MatchPlayer,
        MatchPlayer,
      ],
    );
    const persistedState = state.state as string;
    const isLegacySubmissionState = persistedState === "EDITING" || persistedState === "SWAPPING";
    match.state = isLegacySubmissionState ? "CANCELLED" : state.state;
    match.stateVersion = state.stateVersion;
    match.deadlineMs = isLegacySubmissionState ? null : state.deadlineMs;
    match.winnerId = state.winnerId;
    match.endReason = isLegacySubmissionState ? "CANCELLED" : state.endReason;
    match.cancelReason = isLegacySubmissionState
      ? "이전 제작 방식의 경기는 게임 규칙 변경으로 안전하게 취소되었습니다."
      : state.cancelReason;
    match.players = state.players.map((player) => ({
      ...structuredClone(player),
      foundIds: new Set(player.foundIds),
    })) as [InternalPlayer, InternalPlayer];
    return match;
  }

  serialize(): PersistedMatchState {
    return {
      matchId: this.matchId,
      imageId: this.imageId,
      state: this.state,
      stateVersion: this.stateVersion,
      deadlineMs: this.deadlineMs,
      winnerId: this.winnerId,
      endReason: this.endReason,
      cancelReason: this.cancelReason,
      players: this.players.map((player) => ({
        playerId: player.playerId,
        nickname: player.nickname,
        ready: player.ready,
        foundIds: [...player.foundIds],
        wrongAnswerCount: player.wrongAnswerCount,
        hintsUsed: player.hintsUsed,
        lastCorrectAtMs: player.lastCorrectAtMs,
        connectionStatus: player.connectionStatus,
      })) as [PersistedMatchPlayer, PersistedMatchPlayer],
    };
  }

  get currentState(): GameState {
    return this.state;
  }

  get version(): number {
    return this.stateVersion;
  }

  markReady(playerId: string, nowMs: number): void {
    this.requireState("READY");
    const player = this.getPlayer(playerId);
    if (player.ready) return;

    player.ready = true;
    this.bumpVersion();
    if (this.players.every((candidate) => candidate.ready)) {
      this.startFinding(nowMs);
    }
  }

  guess(playerId: string, point: NormalizedPoint, nowMs: number): GuessResult {
    this.requireState("FINDING");
    const player = this.getPlayer(playerId);
    this.requireBeforeDeadline(playerId, nowMs);
    if (player.foundIds.size === GAME_CONFIG.differenceCount) {
      throw new GameRuleError("PLAYER_ALREADY_COMPLETED", "이미 모든 차이점을 찾았습니다.");
    }
    const differences = getSystemSceneDifferences(this.imageId);
    const hit = differences.find((difference) =>
      isPointInAnswerRegion(point, difference.region),
    );
    const alreadyFound = hit ? player.foundIds.has(hit.id) : false;

    if (hit && !alreadyFound) {
      player.foundIds.add(hit.id);
      player.lastCorrectAtMs = nowMs;
      this.bumpVersion();
    } else if (!hit) {
      player.wrongAnswerCount += 1;
      this.bumpVersion();
    }

    const remainingTimeMs = this.getPlayerRemainingTime(player, nowMs);
    if (this.players.every((candidate) => candidate.foundIds.size === GAME_CONFIG.differenceCount)) {
      this.finishByResults("COMPLETED");
    }

    return {
      correct: Boolean(hit),
      differenceId: hit?.id ?? null,
      // 이미 맞힌 곳이므로 위치를 알려줘도 정보가 새지 않는다.
      region: hit ? { ...hit.region } : null,
      remainingTimeMs,
    };
  }

  useHint(playerId: string, nowMs: number): HintResult {
    this.requireState("FINDING");
    const player = this.getPlayer(playerId);
    this.requireBeforeDeadline(playerId, nowMs);
    if (player.hintsUsed >= GAME_CONFIG.hintsPerGame) {
      throw new GameRuleError("NO_HINTS", "사용할 수 있는 힌트가 없습니다.");
    }

    const difference = getSystemSceneDifferences(this.imageId).find((item) => !player.foundIds.has(item.id));
    if (!difference) {
      throw new GameRuleError("NO_HINT_TARGET", "힌트를 표시할 차이점이 없습니다.");
    }

    player.hintsUsed += 1;
    this.bumpVersion();
    return {
      area: this.toHintArea(difference.region),
      remaining: GAME_CONFIG.hintsPerGame - player.hintsUsed,
    };
  }

  expire(nowMs: number): boolean {
    if (this.deadlineMs === null || nowMs < this.deadlineMs) return false;

    if (this.state === "FINDING") {
      this.finishByResults("TIMEOUT");
      return true;
    }

    return false;
  }

  /**
   * 뷰어별 스냅샷.
   *
   * 여기서 상대의 제작 명령(strokes/fill)이나 미발견 정답 좌표를 내보내면
   * 풀이 클라이언트에서 개발자도구만 열어도 정답이 보인다.
   * 그래서 풀이 중에는 렌더된 이미지와 "이미 맞힌 위치"만 내보내고,
   * 전체 정답은 FINISHED가 된 뒤에만 공개한다.
   */
  snapshot(viewerId?: string): GameSnapshot {
    const viewer = viewerId ? this.getPlayer(viewerId) : null;
    const targetDifferences = getSystemSceneDifferences(this.imageId);

    return {
      matchId: this.matchId,
      state: this.state,
      stateVersion: this.stateVersion,
      imageId: this.imageId,
      deadlineMs: this.deadlineMs,
      players: this.players.map((player) => this.toProgress(player)) as [
        PlayerProgress,
        PlayerProgress,
      ],
      winnerId: this.winnerId,
      myFoundIds: viewer ? [...viewer.foundIds] : [],
      foundMarks: viewer ? this.toFoundMarks(viewer, targetDifferences) : [],
      revealedDifferences:
        this.state === "FINISHED" && viewer
          ? this.toRevealed(viewer, targetDifferences)
          : null,
      endReason: this.endReason,
      cancelReason: this.cancelReason,
    };
  }

  setConnectionStatus(
    playerId: string,
    status: "CONNECTED" | "RECONNECTING",
  ): void {
    if (this.state === "FINISHED" || this.state === "CANCELLED") return;
    const player = this.getPlayer(playerId);
    if (player.connectionStatus === status) return;
    player.connectionStatus = status;
    this.bumpVersion();
  }

  forfeit(playerId: string): void {
    if (this.state === "FINISHED" || this.state === "CANCELLED") return;
    const player = this.getPlayer(playerId);
    player.connectionStatus = "FORFEITED";
    this.finish(this.getOpponent(playerId).playerId, "FORFEIT");
  }

  cancel(reason = "경기를 계속할 수 없는 서버 오류가 발생했습니다."): void {
    if (this.state === "FINISHED" || this.state === "CANCELLED") return;
    this.endReason = "CANCELLED";
    this.cancelReason = reason;
    this.transition("CANCELLED", null);
  }

  private startFinding(nowMs: number): void {
    this.transition("FINDING", nowMs + GAME_CONFIG.findingDurationSeconds * 1_000);
  }

  private finish(winnerId: string | null, reason: GameEndReason): void {
    this.winnerId = winnerId;
    this.endReason = reason;
    this.transition("FINISHED", null);
  }

  private finishByResults(reason: GameEndReason): void {
    const [first, second] = this.players;
    this.finish(
      determineWinner(
        { playerId: first.playerId, foundCount: first.foundIds.size, wrongAnswerCount: first.wrongAnswerCount, lastCorrectAtMs: first.lastCorrectAtMs },
        { playerId: second.playerId, foundCount: second.foundIds.size, wrongAnswerCount: second.wrongAnswerCount, lastCorrectAtMs: second.lastCorrectAtMs },
      ),
      reason,
    );
  }


  private requireBeforeDeadline(playerId: string, nowMs: number): void {
    if (this.deadlineMs === null) return;
    if (this.state === "FINDING") {
      const player = this.getPlayer(playerId);
      if (this.getPlayerRemainingTime(player, nowMs) > 0) return;
      this.finishByResults("TIMEOUT");
      throw new GameRuleError("DEADLINE_EXPIRED", "이 단계의 제한시간이 종료되었습니다.");
    } else if (nowMs < this.deadlineMs) {
      return;
    }

    this.expire(nowMs);
    throw new GameRuleError("DEADLINE_EXPIRED", "이 단계의 제한시간이 종료되었습니다.");
  }

  private requireState(expected: GameState): void {
    if (this.state !== expected) {
      throw new GameRuleError(
        "INVALID_STATE",
        `${this.state} 상태에서는 이 행동을 수행할 수 없습니다.`,
      );
    }
  }

  private getPlayer(playerId: string): InternalPlayer {
    const player = this.players.find((candidate) => candidate.playerId === playerId);
    if (!player) throw new GameRuleError("PLAYER_NOT_FOUND", "경기 참가자가 아닙니다.");
    return player;
  }

  private getOpponent(playerId: string): InternalPlayer {
    this.getPlayer(playerId);
    return this.players.find((candidate) => candidate.playerId !== playerId)!;
  }

  private getPlayerRemainingTime(player: InternalPlayer, nowMs: number): number {
    if (this.deadlineMs === null) return 0;
    return getRemainingTimeMs(this.deadlineMs, nowMs, player.wrongAnswerCount);
  }

  private transition(state: GameState, deadlineMs: number | null): void {
    this.state = state;
    this.deadlineMs = deadlineMs;
    this.bumpVersion();
  }

  private bumpVersion(): void {
    this.stateVersion += 1;
  }

  private toProgress(player: InternalPlayer): PlayerProgress {
    return {
      playerId: player.playerId,
      nickname: player.nickname,
      ready: player.ready,
      foundCount: player.foundIds.size,
      wrongAnswerCount: player.wrongAnswerCount,
      hintsRemaining: GAME_CONFIG.hintsPerGame - player.hintsUsed,
      connectionStatus: player.connectionStatus,
    };
  }


  /** 뷰어가 이미 맞힌 차이점만 위치와 함께 돌려준다. */
  private toFoundMarks(viewer: InternalPlayer, differences: Difference[]): FoundMark[] {
    return differences
      .filter((difference) => viewer.foundIds.has(difference.id))
      .map((difference) => ({
        differenceId: difference.id,
        region: { ...difference.region },
      }));
  }

  /** 경기 종료 후에만 호출한다. 진행 중에 부르면 정답이 노출된다. */
  private toRevealed(viewer: InternalPlayer, differences: Difference[]): RevealedDifference[] {
    return differences.map((difference) => ({
      id: difference.id,
      kind: difference.kind,
      region: { ...difference.region },
      found: viewer.foundIds.has(difference.id),
    }));
  }

  private toHintArea(region: AnswerRegion): AnswerRegion {
    return { ...region, radius: Math.min(region.radius * 2.5, 0.25) };
  }
}
