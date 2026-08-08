import {
  GAME_CONFIG,
  type AnswerRegion,
  type FoundMark,
  type GameEndReason,
  type GamePuzzleId,
  type GameSceneId,
  type GameSnapshot,
  type GameState,
  type GuessResult,
  type NormalizedPoint,
  type OpponentPlayerProgress,
  type PlayerProgress,
  type RevealedDifference,
  type SelfPlayerProgress,
} from "@spot-battle/shared";
import { isPointInAnswerRegion } from "./index.js";

export class GameRuleError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "GameRuleError";
  }
}

export interface MatchPlayer {
  playerId: string;
  nickname: string;
}

export interface PuzzleDifference {
  id: string;
  label: string;
  regions: AnswerRegion[];
}

export interface MatchPuzzle {
  id: GamePuzzleId;
  differences: PuzzleDifference[];
}

export interface PersistedMatchPlayer extends MatchPlayer {
  ready: boolean;
  loaded: boolean;
  puzzleIndex: number;
  foundIdsByPuzzle: string[][];
  wrongAnswerCount: number;
  inputLockedUntilMs: number | null;
  lastCorrectAtMs: number | null;
  connectionStatus: "CONNECTED" | "RECONNECTING" | "FORFEITED";
}

export interface PersistedMatchState {
  schemaVersion: 2;
  matchId: string;
  puzzles: MatchPuzzle[];
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
  loaded: boolean;
  puzzleIndex: number;
  foundIdsByPuzzle: Set<string>[];
  wrongAnswerCount: number;
  inputLockedUntilMs: number | null;
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
    public readonly puzzles: readonly MatchPuzzle[],
    players: [MatchPlayer, MatchPlayer],
    createdAtMs = Date.now(),
  ) {
    if (players[0].playerId === players[1].playerId) {
      throw new GameRuleError("DUPLICATE_PLAYER", "서로 다른 두 플레이어가 필요합니다.");
    }
    if (puzzles.length === 0) {
      throw new GameRuleError("NO_PUZZLES", "경기에 사용할 문제가 없습니다.");
    }
    for (const puzzle of puzzles) this.validatePuzzle(puzzle);
    this.players = players.map((player) => ({
      ...player,
      ready: false,
      loaded: false,
      puzzleIndex: 0,
      foundIdsByPuzzle: puzzles.map(() => new Set<string>()),
      wrongAnswerCount: 0,
      inputLockedUntilMs: null,
      lastCorrectAtMs: null,
      connectionStatus: "CONNECTED",
    })) as [InternalPlayer, InternalPlayer];
    this.deadlineMs = createdAtMs + GAME_CONFIG.readyTimeoutSeconds * 1_000;
  }

  static restore(state: PersistedMatchState): GameMatch {
    if (state.schemaVersion !== 2) throw new Error("지원하지 않는 활성 경기 형식입니다.");
    const match = new GameMatch(
      state.matchId,
      state.puzzles,
      state.players.map(({ playerId, nickname }) => ({ playerId, nickname })) as [MatchPlayer, MatchPlayer],
    );
    match.state = state.state;
    match.stateVersion = state.stateVersion;
    match.deadlineMs = state.deadlineMs;
    match.winnerId = state.winnerId;
    match.endReason = state.endReason;
    match.cancelReason = state.cancelReason;
    match.players = state.players.map((player) => ({
      ...structuredClone(player),
      foundIdsByPuzzle: player.foundIdsByPuzzle.map((ids) => new Set(ids)),
    })) as [InternalPlayer, InternalPlayer];
    return match;
  }

  serialize(): PersistedMatchState {
    return {
      schemaVersion: 2,
      matchId: this.matchId,
      puzzles: structuredClone(this.puzzles) as MatchPuzzle[],
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
        loaded: player.loaded,
        puzzleIndex: player.puzzleIndex,
        foundIdsByPuzzle: player.foundIdsByPuzzle.map((ids) => [...ids]),
        wrongAnswerCount: player.wrongAnswerCount,
        inputLockedUntilMs: player.inputLockedUntilMs,
        lastCorrectAtMs: player.lastCorrectAtMs,
        connectionStatus: player.connectionStatus,
      })) as [PersistedMatchPlayer, PersistedMatchPlayer],
    };
  }

  get currentState(): GameState { return this.state; }
  get version(): number { return this.stateVersion; }

  markReady(playerId: string, nowMs: number): void {
    this.requireState("READY");
    this.requireBeforeDeadline(nowMs);
    const player = this.getPlayer(playerId);
    if (player.ready) return;
    player.ready = true;
    this.bumpVersion();
    if (this.players.every((candidate) => candidate.ready)) {
      this.transition("PRELOADING", nowMs + GAME_CONFIG.preloadTimeoutSeconds * 1_000);
    }
  }

  markLoaded(playerId: string, puzzleId: GamePuzzleId, nowMs: number): void {
    this.requireState("PRELOADING");
    this.requireBeforeDeadline(nowMs);
    const player = this.getPlayer(playerId);
    if (puzzleId !== this.puzzles[0]?.id) {
      throw new GameRuleError("WRONG_PUZZLE", "현재 경기의 첫 문제가 아닙니다.");
    }
    if (player.loaded) return;
    player.loaded = true;
    this.bumpVersion();
    if (this.players.every((candidate) => candidate.loaded)) {
      this.transition("COUNTDOWN", nowMs + GAME_CONFIG.countdownSeconds * 1_000);
    }
  }

  guess(playerId: string, puzzleId: GamePuzzleId, point: NormalizedPoint, nowMs: number): GuessResult {
    this.requireState("PLAYING");
    this.requireBeforeDeadline(nowMs);
    const player = this.getPlayer(playerId);
    if (player.inputLockedUntilMs && nowMs < player.inputLockedUntilMs) {
      throw new GameRuleError("INPUT_LOCKED", "오답 입력 잠금이 끝난 뒤 다시 시도해주세요.");
    }
    const puzzle = this.puzzles[player.puzzleIndex];
    if (!puzzle || puzzle.id !== puzzleId) {
      throw new GameRuleError("WRONG_PUZZLE", "현재 풀고 있는 문제가 아닙니다.");
    }
    const foundIds = player.foundIdsByPuzzle[player.puzzleIndex]!;
    const hit = puzzle.differences.find((difference) =>
      difference.regions.some((region) => isPointInAnswerRegion(point, region)),
    );
    const matchedRegion = hit?.regions.find((region) => isPointInAnswerRegion(point, region)) ?? null;
    const alreadyFound = hit ? foundIds.has(hit.id) : false;
    let puzzleCompleted = false;

    if (hit && !alreadyFound) {
      foundIds.add(hit.id);
      player.lastCorrectAtMs = nowMs;
      player.inputLockedUntilMs = null;
      if (foundIds.size === GAME_CONFIG.differenceCount) {
        puzzleCompleted = true;
        player.puzzleIndex += 1;
      }
      this.bumpVersion();
    } else if (!hit) {
      player.wrongAnswerCount += 1;
      player.inputLockedUntilMs = nowMs + GAME_CONFIG.wrongAnswerLockSeconds * 1_000;
      this.bumpVersion();
    }

    return {
      outcome: hit ? (alreadyFound ? "DUPLICATE" : "CORRECT") : "WRONG",
      correct: Boolean(hit),
      differenceId: hit?.id ?? null,
      region: matchedRegion ? { ...matchedRegion } : null,
      remainingTimeMs: this.getRemainingTime(nowMs),
      puzzleCompleted,
      matchFinished: this.state === "FINISHED",
      inputLockedUntilMs: player.inputLockedUntilMs,
      currentPuzzleId: this.puzzles[player.puzzleIndex]?.id ?? null,
    };
  }

  expire(nowMs: number): boolean {
    if (this.deadlineMs === null || nowMs < this.deadlineMs) return false;
    if (this.state === "READY") {
      this.cancel("준비 제한시간 안에 양쪽 준비가 끝나지 않았습니다.");
      return true;
    }
    if (this.state === "PRELOADING") {
      this.cancel("문제 이미지를 제한시간 안에 불러오지 못했습니다.");
      return true;
    }
    if (this.state === "COUNTDOWN") {
      this.transition("PLAYING", nowMs + GAME_CONFIG.gameDurationSeconds * 1_000);
      return true;
    }
    if (this.state === "PLAYING") {
      this.finish(this.determineWinner(), "TIMEOUT");
      return true;
    }
    return false;
  }

  snapshot(viewerId?: string): GameSnapshot {
    const viewer = viewerId ? this.getPlayer(viewerId) : this.players[0];
    const currentIndex = Math.min(viewer.puzzleIndex, this.puzzles.length - 1);
    const currentPuzzle = this.puzzles[currentIndex]!;
    const nextPuzzle = this.puzzles[viewer.puzzleIndex + 1] ?? null;
    const currentFound = viewer.foundIdsByPuzzle[currentIndex] ?? new Set<string>();
    return {
      matchId: this.matchId,
      state: this.state,
      stateVersion: this.stateVersion,
      imageId: currentPuzzle.id as GameSceneId,
      currentPuzzleId: viewer.puzzleIndex < this.puzzles.length ? currentPuzzle.id : null,
      nextPuzzleId: nextPuzzle?.id ?? null,
      totalPuzzleCount: this.puzzles.length,
      deadlineMs: this.deadlineMs,
      players: this.players.map((player) => this.toProgress(player, !viewerId || player.playerId === viewer.playerId)) as [PlayerProgress, PlayerProgress],
      winnerId: this.winnerId,
      problemImage: null,
      myFoundIds: viewer.puzzleIndex < this.puzzles.length ? [...currentFound] : [],
      foundMarks: viewer.puzzleIndex < this.puzzles.length ? this.toFoundMarks(currentPuzzle, currentFound) : [],
      revealedDifferences: this.state === "FINISHED" ? this.toRevealed(currentPuzzle, currentFound) : null,
      endReason: this.endReason,
      cancelReason: this.cancelReason,
    };
  }

  setConnectionStatus(playerId: string, status: "CONNECTED" | "RECONNECTING"): void {
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

  private determineWinner(): string | null {
    const [first, second] = this.players;
    if (first.puzzleIndex !== second.puzzleIndex) return first.puzzleIndex > second.puzzleIndex ? first.playerId : second.playerId;
    const firstFound = first.foundIdsByPuzzle[first.puzzleIndex]?.size ?? 0;
    const secondFound = second.foundIdsByPuzzle[second.puzzleIndex]?.size ?? 0;
    if (firstFound !== secondFound) return firstFound > secondFound ? first.playerId : second.playerId;
    if (first.wrongAnswerCount !== second.wrongAnswerCount) return first.wrongAnswerCount < second.wrongAnswerCount ? first.playerId : second.playerId;
    return null;
  }

  private finish(winnerId: string | null, reason: GameEndReason): void {
    this.winnerId = winnerId;
    this.endReason = reason;
    this.transition("FINISHED", null);
  }

  private requireBeforeDeadline(nowMs: number): void {
    if (this.deadlineMs !== null && nowMs >= this.deadlineMs) {
      this.expire(nowMs);
      throw new GameRuleError("DEADLINE_EXPIRED", "경기 제한시간이 종료되었습니다.");
    }
  }

  private requireState(expected: GameState): void {
    if (this.state !== expected) throw new GameRuleError("INVALID_STATE", `${this.state} 상태에서는 이 행동을 수행할 수 없습니다.`);
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

  private getRemainingTime(nowMs: number): number {
    return this.deadlineMs === null ? 0 : Math.max(0, this.deadlineMs - nowMs);
  }

  private transition(state: GameState, deadlineMs: number | null): void {
    this.state = state;
    this.deadlineMs = deadlineMs;
    this.bumpVersion();
  }

  private bumpVersion(): void { this.stateVersion += 1; }

  private toProgress(player: InternalPlayer, isViewer: boolean): SelfPlayerProgress | OpponentPlayerProgress {
    const foundCount = player.foundIdsByPuzzle[player.puzzleIndex]?.size ?? 0;
    const publicProgress: OpponentPlayerProgress = {
      playerId: player.playerId,
      nickname: player.nickname,
      ready: player.ready,
      loaded: player.loaded,
      completedPuzzleCount: player.puzzleIndex,
      foundCount,
      connectionStatus: player.connectionStatus,
      perspective: "OPPONENT",
    };
    if (!isViewer) return publicProgress;
    return {
      ...publicProgress,
      perspective: "SELF",
      puzzleIndex: player.puzzleIndex,
      totalFoundCount: player.puzzleIndex * GAME_CONFIG.differenceCount + foundCount,
      wrongAnswerCount: player.wrongAnswerCount,
      inputLockedUntilMs: player.inputLockedUntilMs,
    };
  }

  private validatePuzzle(puzzle: MatchPuzzle): void {
    if (puzzle.differences.length !== GAME_CONFIG.differenceCount) {
      throw new GameRuleError("INVALID_PUZZLE", puzzle.id + " 문제의 차이점 수가 올바르지 않습니다.");
    }
    const ids = new Set<string>();
    for (const difference of puzzle.differences) {
      if (!difference.id || ids.has(difference.id)) {
        throw new GameRuleError("INVALID_PUZZLE", puzzle.id + " 문제에 비어 있거나 중복된 차이점 ID가 있습니다.");
      }
      ids.add(difference.id);
      if (difference.regions.length !== 1) {
        throw new GameRuleError("INVALID_PUZZLE", puzzle.id + " 문제의 각 차이점은 정확히 하나의 영역이어야 합니다.");
      }
      const region = difference.regions[0]!;
      if (
        !Number.isFinite(region.x) || !Number.isFinite(region.y) || !Number.isFinite(region.radius) ||
        region.radius <= 0 || region.radius > 0.5 ||
        region.x - region.radius < 0 || region.x + region.radius > 1 ||
        region.y - region.radius < 0 || region.y + region.radius > 1
      ) {
        throw new GameRuleError("INVALID_PUZZLE", puzzle.id + " 문제에 유효하지 않은 정답 영역이 있습니다.");
      }
    }
    for (let left = 0; left < puzzle.differences.length; left += 1) {
      for (let right = left + 1; right < puzzle.differences.length; right += 1) {
        const a = puzzle.differences[left]!.regions[0]!;
        const b = puzzle.differences[right]!.regions[0]!;
        if (Math.hypot(a.x - b.x, a.y - b.y) < a.radius + b.radius) {
          throw new GameRuleError("INVALID_PUZZLE", puzzle.id + " 문제의 정답 영역이 서로 겹칩니다.");
        }
      }
    }
  }

  private toFoundMarks(puzzle: MatchPuzzle, foundIds: Set<string>): FoundMark[] {
    return puzzle.differences
      .filter((difference) => foundIds.has(difference.id))
      .flatMap((difference) => difference.regions.map((region) => ({ differenceId: difference.id, region: { ...region } })));
  }

  private toRevealed(puzzle: MatchPuzzle, foundIds: Set<string>): RevealedDifference[] {
    return puzzle.differences.map((difference) => ({
      id: difference.id,
      kind: "COLOR",
      region: { ...difference.regions[0]! },
      found: foundIds.has(difference.id),
    }));
  }
}
