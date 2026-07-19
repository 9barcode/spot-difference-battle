import {
  GAME_CONFIG,
  type AnswerRegion,
  type Difference,
  type GameSnapshot,
  type GameState,
  type GameEndReason,
  type GuessResult,
  type HintResult,
  type NormalizedPoint,
  type PlayerProgress,
  type PlayerResult,
} from "@spot-battle/shared";
import {
  determineWinner,
  getRemainingTimeMs,
  isPointInAnswerRegion,
  validateDifferences,
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
  differences: Difference[] | null;
  problemImageDataUrl: string | null;
  autoFilledIds: string[];
  autoFillOverlayDataUrl: string | null;
  foundIds: string[];
  wrongAnswerCount: number;
  hintsUsed: number;
  lastCorrectAtMs: number | null;
  connectionStatus: "CONNECTED" | "RECONNECTING" | "FORFEITED";
}

export interface PersistedMatchState {
  matchId: string;
  imageId: string;
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
  differences: Difference[] | null;
  problemImageDataUrl: string | null;
  autoFilledIds: string[];
  autoFillOverlayDataUrl: string | null;
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
    public readonly imageId: string,
    players: [MatchPlayer, MatchPlayer],
    private readonly fallbackDifferences: Difference[],
  ) {
    const validation = validateDifferences(
      fallbackDifferences,
      undefined,
      fallbackDifferences.length,
    );
    if (fallbackDifferences.length < GAME_CONFIG.differenceCount) {
      throw new GameRuleError("INVALID_FALLBACK", "자동 보충 후보가 부족합니다.");
    }
    if (!validation.valid) {
      throw new GameRuleError("INVALID_FALLBACK", validation.errors.join(" "));
    }
    if (players[0].playerId === players[1].playerId) {
      throw new GameRuleError("DUPLICATE_PLAYER", "서로 다른 두 플레이어가 필요합니다.");
    }

    this.players = players.map((player) => ({
      ...player,
      ready: false,
      differences: null,
      problemImageDataUrl: null,
      autoFilledIds: [],
      autoFillOverlayDataUrl: null,
      foundIds: new Set<string>(),
      wrongAnswerCount: 0,
      hintsUsed: 0,
      lastCorrectAtMs: null,
      connectionStatus: "CONNECTED",
    })) as unknown as [InternalPlayer, InternalPlayer];
  }

  static restore(state: PersistedMatchState, fallbackDifferences: Difference[]): GameMatch {
    const match = new GameMatch(
      state.matchId,
      state.imageId,
      state.players.map(({ playerId, nickname }) => ({ playerId, nickname })) as [MatchPlayer, MatchPlayer],
      fallbackDifferences,
    );
    match.state = state.state;
    match.stateVersion = state.stateVersion;
    match.deadlineMs = state.deadlineMs;
    match.winnerId = state.winnerId;
    match.endReason = state.endReason;
    match.cancelReason = state.cancelReason;
    match.players = state.players.map((player) => ({
      ...structuredClone(player),
      autoFilledIds: player.autoFilledIds ?? [],
      autoFillOverlayDataUrl: player.autoFillOverlayDataUrl ?? null,
      foundIds: new Set(player.foundIds),
    })) as unknown as [InternalPlayer, InternalPlayer];
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
        differences: structuredClone(player.differences),
        problemImageDataUrl: player.problemImageDataUrl,
        autoFilledIds: [...player.autoFilledIds],
        autoFillOverlayDataUrl: player.autoFillOverlayDataUrl,
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
      this.transition("EDITING", nowMs + GAME_CONFIG.editingDurationSeconds * 1_000);
    }
  }

  submitDifferences(
    playerId: string,
    differences: Difference[],
    nowMs: number,
    problemImageDataUrl: string | null = null,
  ): void {
    this.requireState("EDITING");
    this.requireBeforeDeadline(playerId, nowMs);
    const player = this.getPlayer(playerId);
    if (player.differences) {
      throw new GameRuleError("ALREADY_SUBMITTED", "이미 차이점을 제출했습니다.");
    }

    if (differences.length < 1 || differences.length > GAME_CONFIG.differenceCount) {
      throw new GameRuleError("INVALID_DIFFERENCES", "차이점은 1개 이상 3개 이하여야 합니다.");
    }
    const validation = validateDifferences(differences, undefined, differences.length);
    if (!validation.valid) {
      throw new GameRuleError("INVALID_DIFFERENCES", validation.errors.join(" "));
    }

    player.differences = structuredClone(differences);
    player.problemImageDataUrl = problemImageDataUrl;
    this.bumpVersion();
    if (this.players.every((candidate) => candidate.differences?.length === GAME_CONFIG.differenceCount)) {
      this.startFinding(nowMs);
    }
  }

  guess(playerId: string, point: NormalizedPoint, nowMs: number): GuessResult {
    this.requireState("FINDING");
    this.requireBeforeDeadline(playerId, nowMs);
    const player = this.getPlayer(playerId);
    const target = this.getOpponent(playerId);
    const differences = target.differences ?? [];
    const hit = differences.find(
      (difference) =>
        !player.foundIds.has(difference.id) && isPointInAnswerRegion(point, difference.region),
    );

    if (hit) {
      player.foundIds.add(hit.id);
      player.lastCorrectAtMs = nowMs;
    } else {
      player.wrongAnswerCount += 1;
    }
    this.bumpVersion();

    const remainingTimeMs = this.getPlayerRemainingTime(player, nowMs);
    if (player.foundIds.size === GAME_CONFIG.differenceCount) {
      this.finish(playerId, "COMPLETED");
    } else if (remainingTimeMs === 0) {
      this.finishByScore();
    }

    return {
      correct: Boolean(hit),
      differenceId: hit?.id ?? null,
      remainingTimeMs,
    };
  }

  useHint(playerId: string, nowMs: number): HintResult {
    this.requireState("FINDING");
    this.requireBeforeDeadline(playerId, nowMs);
    const player = this.getPlayer(playerId);
    if (player.hintsUsed >= GAME_CONFIG.hintsPerGame) {
      throw new GameRuleError("NO_HINTS", "사용할 수 있는 힌트가 없습니다.");
    }

    const target = this.getOpponent(playerId);
    const difference = target.differences?.find((item) => !player.foundIds.has(item.id));
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

    if (this.state === "EDITING") {
      for (const player of this.players) this.autoFillPlayer(player);
      if (this.players.every((player) => player.differences?.length === GAME_CONFIG.differenceCount)) {
        this.startFinding(nowMs);
      } else {
        this.cancel("자동 보충 후보가 부족해 경기를 계속할 수 없습니다.");
      }
      return true;
    }

    if (this.state === "FINDING") {
      this.finishByScore("TIMEOUT");
      return true;
    }

    return false;
  }

  snapshot(viewerId?: string): GameSnapshot {
    const viewer = viewerId ? this.getPlayer(viewerId) : null;
    const problemOwner = viewerId ? this.getOpponent(viewerId) : null;
    const canViewProblem = this.state === "FINDING" || this.state === "FINISHED";
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
      problemImageDataUrl:
        canViewProblem && problemOwner?.differences
          ? problemOwner.problemImageDataUrl
          : null,
      autoFillOverlayDataUrl:
        canViewProblem && problemOwner?.differences
          ? problemOwner.autoFillOverlayDataUrl
          : null,
      myFoundIds: viewer ? [...viewer.foundIds] : [],
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

  setAutoFillOverlay(playerId: string, dataUrl: string): void {
    this.getPlayer(playerId).autoFillOverlayDataUrl = dataUrl;
  }

  getAutoFilledDifferences(playerId: string): Difference[] {
    const player = this.getPlayer(playerId);
    return (player.differences ?? []).filter((difference) => player.autoFilledIds.includes(difference.id));
  }

  private autoFillPlayer(player: InternalPlayer): void {
    const selected = structuredClone(player.differences ?? []);
    for (const candidate of this.fallbackDifferences) {
      if (selected.length >= GAME_CONFIG.differenceCount) break;
      if (selected.some((difference) => difference.id === candidate.id)) continue;
      const next = [...selected, candidate];
      if (validateDifferences(next, undefined, next.length).valid) {
        selected.push(structuredClone(candidate));
        player.autoFilledIds.push(candidate.id);
      }
    }
    player.differences = selected;
    this.bumpVersion();
  }

  private startFinding(nowMs: number): void {
    this.transition("SWAPPING", null);
    this.transition("FINDING", nowMs + GAME_CONFIG.findingDurationSeconds * 1_000);
  }

  private finish(winnerId: string | null, reason: GameEndReason): void {
    this.winnerId = winnerId;
    this.endReason = reason;
    this.transition("FINISHED", null);
  }

  private finishByScore(reason: GameEndReason = "TIMEOUT"): void {
    this.finish(
      determineWinner(this.toResult(this.players[0]), this.toResult(this.players[1])),
      reason,
    );
  }

  private requireBeforeDeadline(playerId: string, nowMs: number): void {
    if (this.deadlineMs === null) return;
    if (this.state === "FINDING") {
      const player = this.getPlayer(playerId);
      if (this.getPlayerRemainingTime(player, nowMs) > 0) return;
      this.finishByScore();
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
      submitted: player.differences !== null,
      autoFilledCount: player.autoFilledIds.length,
      foundCount: player.foundIds.size,
      wrongAnswerCount: player.wrongAnswerCount,
      hintsRemaining: GAME_CONFIG.hintsPerGame - player.hintsUsed,
      connectionStatus: player.connectionStatus,
    };
  }

  private toResult(player: InternalPlayer): PlayerResult {
    return {
      playerId: player.playerId,
      foundCount: player.foundIds.size,
      wrongAnswerCount: player.wrongAnswerCount,
      lastCorrectAtMs: player.lastCorrectAtMs,
    };
  }

  private toHintArea(region: AnswerRegion): AnswerRegion {
    return { ...region, radius: Math.min(region.radius * 2.5, 0.25) };
  }
}
