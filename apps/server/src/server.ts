import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import { GameMatch, GameRuleError } from "@spot-battle/game-core";
import {
  GAME_CONFIG,
  type ClientToServerEvents,
  type GameSceneId,
  type ServerToClientEvents,
} from "@spot-battle/shared";
import Fastify, { type FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import { Server, type Socket } from "socket.io";
import type { GameSceneImageOverrides } from "./game-scenes.js";
import { MatchRegistry } from "./match-registry.js";
import { InMemoryMatchStore, type MatchStore } from "./match-store.js";
import { GAME_PUZZLES } from "./game-puzzles.js";

export interface GameServerOptions {
  webOrigin?: string;
  /** Built web client directory to serve from the same origin in production. */
  staticRoot?: string;
  /** Directory containing server-side original PNG files for submission validation. */
  gameAssetRoot?: string;
  reconnectGraceMs?: number;
  inputCooldownMs?: number;
  /** 종료 결과 재조회·신고를 허용한 뒤 서버 메모리에서 경기를 제거하기까지의 시간. */
  finishedMatchRetentionMs?: number;
  matchStore?: MatchStore;
  /** 테스트에서 원본과 수정 이미지의 좌표 검증을 함께 실행하기 위한 원본 이미지 대역. */
  originalProblemImage?: Buffer;
  /** 장면별 원본 이미지 대역. 지정하지 않은 장면은 서버 카탈로그의 번들 원본을 사용한다. */
  originalProblemImages?: GameSceneImageOverrides;
  /** 통합 테스트 등에서 특정 장면으로 매칭을 고정한다. */
  sceneId?: GameSceneId;
}

interface SocketData {
  playerId: string;
  guestToken: string;
}

interface GuestSession {
  guestToken: string;
  playerId: string;
  nickname: string | null;
  socketId: string | null;
}

function requirePayload(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new GameRuleError("INVALID_PAYLOAD", "요청 형식이 올바르지 않습니다.");
  }
  return value as Record<string, unknown>;
}

function requireStringField(payload: unknown, field: string): string {
  const value = requirePayload(payload)[field];
  if (typeof value !== "string") {
    throw new GameRuleError("INVALID_PAYLOAD", `${field} 값이 올바르지 않습니다.`);
  }
  return value;
}

function requireActionContext(payload: unknown): { expectedState: string; expectedStateVersion: number } {
  const input = requirePayload(payload);
  if (typeof input.expectedState !== "string" || !Number.isInteger(input.expectedStateVersion)) {
    throw new GameRuleError("INVALID_PAYLOAD", "경기 상태 정보가 올바르지 않습니다.");
  }
  return {
    expectedState: input.expectedState,
    expectedStateVersion: input.expectedStateVersion as number,
  };
}

function requirePoint(payload: unknown): { x: number; y: number } {
  const point = requirePayload(payload).point;
  if (!point || typeof point !== "object" || Array.isArray(point)) {
    throw new GameRuleError("INVALID_POINT", "선택 좌표가 올바르지 않습니다.");
  }
  const { x, y } = point as Record<string, unknown>;
  if (
    typeof x !== "number" || !Number.isFinite(x) || x < 0 || x > 1 ||
    typeof y !== "number" || !Number.isFinite(y) || y < 0 || y > 1
  ) {
    throw new GameRuleError("INVALID_POINT", "선택 좌표가 올바르지 않습니다.");
  }
  return { x, y };
}

type GameSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>;

export async function createGameServer(options: GameServerOptions): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  if (options.webOrigin) {
    await app.register(cors, { origin: options.webOrigin });
  }
  if (options.staticRoot) {
    await app.register(fastifyStatic, {
      root: options.staticRoot,
      index: ["index.html"],
    });
  }
  const matchStore = options.matchStore ?? new InMemoryMatchStore();
  app.get("/health", async () => {
    const database = await matchStore.health();
    return { status: database ? "ok" : "degraded", server: "ok", database };
  });

  const io = new Server<
    ClientToServerEvents,
    ServerToClientEvents,
    Record<string, never>,
    SocketData
  >(app.server, {
    cors: options.webOrigin ? { origin: options.webOrigin } : undefined,
  });
  const requestedPuzzle = options.sceneId
    ? GAME_PUZZLES.find((puzzle) => puzzle.id === options.sceneId)
    : undefined;
  const registry = new MatchRegistry(requestedPuzzle ? [requestedPuzzle] : undefined);
  const sessionsByToken = new Map<string, GuestSession>();
  const sessionsByPlayer = new Map<string, GuestSession>();
  const reconnectTimers = new Map<string, ReturnType<typeof setTimeout>>();
  const finishedMatchCleanupTimers = new Map<string, ReturnType<typeof setTimeout>>();
  const persistedMatches = new Set<string>();
  const runtimeWrites = new Map<string, Promise<void>>();
  const guestWrites = new Set<Promise<void>>();
  const reconnectGraceMs =
    options.reconnectGraceMs ?? GAME_CONFIG.reconnectGraceSeconds * 1_000;
  const inputCooldownMs = options.inputCooldownMs ?? 120;
  const finishedMatchRetentionMs = options.finishedMatchRetentionMs ?? 5 * 60 * 1_000;
  let waitingPlayer: { playerId: string; socketId: string; nickname: string } | null = null;
  let closing = false;

  function persistGuest(session: GuestSession): void {
    const write = matchStore
      .upsertGuest(session)
      .catch((error) => app.log.error(error));
    guestWrites.add(write);
    void write.finally(() => guestWrites.delete(write));
  }

  function createSession(): GuestSession {
    const session: GuestSession = {
      guestToken: randomUUID(),
      playerId: randomUUID(),
      nickname: null,
      socketId: null,
    };
    sessionsByToken.set(session.guestToken, session);
    sessionsByPlayer.set(session.playerId, session);
    persistGuest(session);
    return session;
  }

  io.use((socket, next) => {
    const requestedToken = socket.handshake.auth.guestToken;
    const session =
      typeof requestedToken === "string" ? sessionsByToken.get(requestedToken) : undefined;
    const activeSession = session ?? createSession();
    socket.data.playerId = activeSession.playerId;
    socket.data.guestToken = activeSession.guestToken;
    next();
  });

  function emitSnapshots(match: GameMatch): void {
    for (const player of match.snapshot().players) {
      io.to(player.playerId).emit("game:snapshot", match.snapshot(player.playerId));
    }
    if (match.currentState !== "FINISHED" && match.currentState !== "CANCELLED") {
      void persistRuntime(match).catch((error) => app.log.error(error));
    }
  }

  function persistRuntime(match: GameMatch): Promise<void> {
    const matchId = match.matchId;
    const state =
      match.currentState === "FINISHED" || match.currentState === "CANCELLED"
        ? null
        : match.serialize();
    const previous = runtimeWrites.get(matchId) ?? Promise.resolve();
    const next = previous
      .catch((error) => app.log.error(error))
      .then(async () => {
        if (state) await matchStore.saveActiveMatch(state);
        else await matchStore.deleteActiveMatch(matchId);
      });
    runtimeWrites.set(matchId, next);
    const clearWrite = () => {
      if (runtimeWrites.get(matchId) === next) runtimeWrites.delete(matchId);
    };
    void next.then(clearWrite, clearWrite);
    return next;
  }

  function scheduleFinishedMatchCleanup(match: GameMatch): void {
    if (finishedMatchCleanupTimers.has(match.matchId)) return;

    const timer = setTimeout(() => {
      finishedMatchCleanupTimers.delete(match.matchId);
      registry.remove(match.matchId);
      persistedMatches.delete(match.matchId);
    }, finishedMatchRetentionMs);
    timer.unref();
    finishedMatchCleanupTimers.set(match.matchId, timer);
  }

  async function persistIfFinished(match: GameMatch): Promise<boolean> {
    if (
      persistedMatches.has(match.matchId) ||
      (match.currentState !== "FINISHED" && match.currentState !== "CANCELLED")
    ) {
      return true;
    }
    try {
      await matchStore.saveMatch(match.snapshot());
      await persistRuntime(match);
      persistedMatches.add(match.matchId);
      scheduleFinishedMatchCleanup(match);
      return true;
    } catch (error) {
      app.log.error(error);
      return false;
    }
  }
  function emitGameError(socket: GameSocket, error: unknown): void {
    if (error instanceof GameRuleError) {
      socket.emit("game:error", { code: error.code, message: error.message });
      return;
    }
    socket.emit("game:error", {
      code: "INTERNAL_ERROR",
      message: "경기 처리 중 오류가 발생했습니다.",
    });
    app.log.error(error);
  }

  function handleActionError(socket: GameSocket, matchId: string, error: unknown): void {
    if (error instanceof GameRuleError) {
      const match = registry.getCurrentForPlayer(socket.data.playerId);
      if (
        match?.matchId === matchId &&
        (match.currentState === "FINISHED" || match.currentState === "CANCELLED")
      ) {
        emitSnapshots(match);
        void persistIfFinished(match);
      }
      emitGameError(socket, error);
      return;
    }
    const match = registry.getCurrentForPlayer(socket.data.playerId);
    if (match?.matchId === matchId) {
      match.cancel();
      emitSnapshots(match);
      void persistIfFinished(match);
    }
    emitGameError(socket, error);
  }

  function assertClientState(
    match: GameMatch,
    playerId: string,
    expectedState: string,
    expectedStateVersion: number,
    allowConcurrentState = false,
  ): void {
    const current = match.snapshot(playerId);
    if (
      current.state !== expectedState ||
      !Number.isInteger(expectedStateVersion) ||
      expectedStateVersion < 0 ||
      (allowConcurrentState
        ? expectedStateVersion > current.stateVersion
        : expectedStateVersion !== current.stateVersion)
    ) {
      throw new GameRuleError("STALE_STATE", "경기 상태가 변경되었습니다. 최신 상태에서 다시 시도해주세요.");
    }
  }

  function resumeMatch(socket: GameSocket, session: GuestSession): void {
    const match = registry.getCurrentForPlayer(session.playerId);
    if (!match) return;
    const snapshot = match.snapshot(session.playerId);
    const opponent = snapshot.players.find((player) => player.playerId !== session.playerId);
    socket.join(`match:${match.matchId}`);
    match.setConnectionStatus(session.playerId, "CONNECTED");
    socket.emit("match:found", {
      matchId: match.matchId,
      playerId: session.playerId,
      opponentNickname: opponent?.nickname ?? "상대",
    });
    emitSnapshots(match);
  }

  function scheduleForfeit(session: GuestSession): void {
    const previous = reconnectTimers.get(session.playerId);
    if (previous) clearTimeout(previous);
    const timer = setTimeout(() => {
      reconnectTimers.delete(session.playerId);
      if (session.socketId) return;
      const match = registry.getCurrentForPlayer(session.playerId);
      if (!match) return;
      match.forfeit(session.playerId);
      emitSnapshots(match);
      void persistIfFinished(match);
    }, reconnectGraceMs);
    timer.unref();
    reconnectTimers.set(session.playerId, timer);
  }

  try {
    const restoredGuests = await matchStore.loadGuests();
    for (const guest of restoredGuests) {
      const session: GuestSession = { ...guest, socketId: null };
      sessionsByToken.set(session.guestToken, session);
      sessionsByPlayer.set(session.playerId, session);
    }

    const restoredMatches = await matchStore.loadActiveMatches();
    for (const state of restoredMatches) {
      try {
        const match = registry.restore(state);
        if (match.expire(Date.now())) {
          await persistIfFinished(match);
          continue;
        }
        const missingSession = state.players.some((player) => !sessionsByPlayer.has(player.playerId));
        if (missingSession) {
          match.cancel("복구할 수 없는 참가자 세션이 있어 경기를 취소했습니다.");
          await persistIfFinished(match);
          continue;
        }
        for (const player of state.players) {
          match.setConnectionStatus(player.playerId, "RECONNECTING");
          scheduleForfeit(sessionsByPlayer.get(player.playerId)!);
        }
        await persistRuntime(match);
      } catch (error) {
        app.log.error(error);
        const matchId = (state as { matchId?: unknown }).matchId;
        if (typeof matchId === "string") await matchStore.deleteActiveMatch(matchId);
      }
    }
  } catch (error) {
    app.log.error(error);
  }

  io.on("connection", (socket) => {
    const lastInputAt = new Map<string, number>();
    const enforceCooldown = (action: string) => {
      if (inputCooldownMs <= 0) return;
      const now = Date.now();
      const previous = lastInputAt.get(action) ?? 0;
      if (now - previous < inputCooldownMs) {
        throw new GameRuleError("INPUT_RATE_LIMITED", "입력이 너무 빠릅니다. 잠시 후 다시 시도해주세요.");
      }
      lastInputAt.set(action, now);
    };
    const session = sessionsByPlayer.get(socket.data.playerId)!;
    const oldSocketId = session.socketId;
    if (oldSocketId && oldSocketId !== socket.id) {
      io.sockets.sockets.get(oldSocketId)?.disconnect(true);
    }
    session.socketId = socket.id;
    const reconnectTimer = reconnectTimers.get(session.playerId);
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimers.delete(session.playerId);
    socket.join(session.playerId);
    socket.emit("session:ready", {
      guestToken: session.guestToken,
      playerId: session.playerId,
    });
    resumeMatch(socket, session);

    socket.on("queue:join", (payload) => {
      try {
        if (registry.getCurrentForPlayer(session.playerId)) {
          throw new GameRuleError("ALREADY_IN_MATCH", "진행 중인 경기를 먼저 마쳐주세요.");
        }
        const normalizedNickname = requireStringField(payload, "nickname").trim().slice(0, 16);
        if (normalizedNickname.length < 2) {
          throw new GameRuleError("INVALID_NICKNAME", "닉네임은 2자 이상이어야 합니다.");
        }
        session.nickname = normalizedNickname;
        persistGuest(session);

        if (!waitingPlayer || waitingPlayer.playerId === session.playerId) {
          waitingPlayer = {
            playerId: session.playerId,
            socketId: socket.id,
            nickname: normalizedNickname,
          };
          return;
        }

        const opponentSocket = io.sockets.sockets.get(waitingPlayer.socketId);
        if (!opponentSocket || registry.getCurrentForPlayer(waitingPlayer.playerId)) {
          waitingPlayer = {
            playerId: session.playerId,
            socketId: socket.id,
            nickname: normalizedNickname,
          };
          return;
        }

        const matchId = randomUUID();
        const room = `match:${matchId}`;
        socket.join(room);
        opponentSocket.join(room);
        const match = registry.create(matchId, [
          { playerId: waitingPlayer.playerId, nickname: waitingPlayer.nickname },
          { playerId: session.playerId, nickname: normalizedNickname },
        ]);

        socket.emit("match:found", {
          matchId,
          playerId: session.playerId,
          opponentNickname: waitingPlayer.nickname,
        });
        opponentSocket.emit("match:found", {
          matchId,
          playerId: waitingPlayer.playerId,
          opponentNickname: normalizedNickname,
        });
        emitSnapshots(match);
        waitingPlayer = null;
      } catch (error) {
        emitGameError(socket, error);
      }
    });
    socket.on("queue:leave", () => {
      if (waitingPlayer?.playerId === session.playerId) waitingPlayer = null;
      socket.emit("queue:left");
    });

    socket.on("game:ready", (payload) => {
      let matchId = "";
      try {
        matchId = requireStringField(payload, "matchId");
        const match = registry.getForPlayer(matchId, session.playerId);
        match.markReady(session.playerId, Date.now());
        emitSnapshots(match);
      } catch (error) {
        handleActionError(socket, matchId, error);
      }
    });

    socket.on("game:loaded", (payload) => {
      let matchId = "";
      try {
        matchId = requireStringField(payload, "matchId");
        const puzzleId = requireStringField(payload, "puzzleId");
        const match = registry.getForPlayer(matchId, session.playerId);
        match.markLoaded(session.playerId, puzzleId as Parameters<GameMatch["markLoaded"]>[1], Date.now());
        emitSnapshots(match);
      } catch (error) {
        handleActionError(socket, matchId, error);
      }
    });

    socket.on("game:guess", (payload) => {
      let matchId = "";
      try {
        matchId = requireStringField(payload, "matchId");
        const puzzleId = requireStringField(payload, "puzzleId");
        const point = requirePoint(payload);
        const { expectedState, expectedStateVersion } = requireActionContext(payload);
        const match = registry.getForPlayer(matchId, session.playerId);
        assertClientState(match, session.playerId, expectedState, expectedStateVersion, true);
        enforceCooldown("guess");
        const versionBeforeGuess = match.version;
        const result = match.guess(
          session.playerId,
          puzzleId as Parameters<GameMatch["guess"]>[1],
          point,
          Date.now(),
        );
        socket.emit("game:guess-result", result);
        if (match.version !== versionBeforeGuess) {
          emitSnapshots(match);
          void persistIfFinished(match);
        }
      } catch (error) {
        handleActionError(socket, matchId, error);
      }
    });

    socket.on("game:hint", (payload) => {
      try {
        requireStringField(payload, "matchId");
        socket.emit("game:error", { code: "NO_HINTS", message: "온라인 경쟁전에는 힌트가 없습니다." });
      } catch (error) {
        emitGameError(socket, error);
      }
    });

    socket.on("game:forfeit", (payload) => {
      let matchId = "";
      try {
        matchId = requireStringField(payload, "matchId");
        const { expectedState, expectedStateVersion } = requireActionContext(payload);
        const match = registry.getForPlayer(matchId, session.playerId);
        assertClientState(match, session.playerId, expectedState, expectedStateVersion);
        match.forfeit(session.playerId);
        emitSnapshots(match);
        void persistIfFinished(match);
      } catch (error) {
        handleActionError(socket, matchId, error);
      }
    });

    socket.on("game:report", async (payload) => {
      try {
        const input = requirePayload(payload);
        const matchId = requireStringField(payload, "matchId");
        const { expectedState, expectedStateVersion } = requireActionContext(payload);
        const allowedReasons = new Set(["UNFAIR", "INAPPROPRIATE", "SYSTEM_ERROR", "OTHER"]);
        if (typeof input.reason !== "string" || !allowedReasons.has(input.reason)) {
          throw new GameRuleError("INVALID_REPORT", "신고 사유가 올바르지 않습니다.");
        }
        if (input.details !== undefined && typeof input.details !== "string") {
          throw new GameRuleError("INVALID_REPORT", "신고 내용이 올바르지 않습니다.");
        }
        const match = registry.getForPlayer(matchId, session.playerId);
        assertClientState(match, session.playerId, expectedState, expectedStateVersion);
        if (match.currentState !== "FINISHED" && match.currentState !== "CANCELLED") {
          throw new GameRuleError("MATCH_NOT_FINISHED", "경기 종료 후 신고할 수 있습니다.");
        }
        if (!await persistIfFinished(match)) {
          throw new Error("MATCH_PERSISTENCE_FAILED");
        }
        const reportId = await matchStore.createReport({
          matchId,
          reporterPlayerId: session.playerId,
          reason: input.reason as Parameters<MatchStore["createReport"]>[0]["reason"],
          details: typeof input.details === "string" ? input.details.trim().slice(0, 500) : undefined,
        });
        socket.emit("game:report-result", { reportId });
      } catch (error) {
        if ((error as Error).message === "DUPLICATE_REPORT") {
          socket.emit("game:error", {
            code: "DUPLICATE_REPORT",
            message: "이미 이 경기를 신고했습니다.",
          });
        } else {
          emitGameError(socket, error);
        }
      }
    });
    socket.on("disconnect", () => {
      if (session.socketId !== socket.id) return;
      session.socketId = null;
      if (waitingPlayer?.playerId === session.playerId) waitingPlayer = null;
      const match = registry.getCurrentForPlayer(session.playerId);
      if (!match || match.currentState === "FINISHED" || match.currentState === "CANCELLED") {
        return;
      }
      match.setConnectionStatus(session.playerId, "RECONNECTING");
      emitSnapshots(match);
      if (!closing) scheduleForfeit(session);
    });
  });

  const expiryTimer = setInterval(() => {
    for (const match of registry.expire(Date.now())) {
      emitSnapshots(match);
      void persistIfFinished(match);
    }
  }, 250);
  expiryTimer.unref();

  app.addHook("onClose", async () => {
    closing = true;
    clearInterval(expiryTimer);
    for (const timer of reconnectTimers.values()) clearTimeout(timer);
    for (const timer of finishedMatchCleanupTimers.values()) clearTimeout(timer);
    finishedMatchCleanupTimers.clear();
    await new Promise<void>((resolve) => io.close(() => resolve()));
    await Promise.allSettled([...runtimeWrites.values(), ...guestWrites]);
    await matchStore.close();
  });

  return app;
}
