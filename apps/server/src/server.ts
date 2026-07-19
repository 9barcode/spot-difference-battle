import cors from "@fastify/cors";
import { GameMatch, GameRuleError } from "@spot-battle/game-core";
import { GAME_CONFIG, type ClientToServerEvents, type Difference, type GameState, type NormalizedPoint, type ServerToClientEvents } from "@spot-battle/shared";
import Fastify, { type FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import { Server, type Socket } from "socket.io";
import { MatchRegistry } from "./match-registry.js";
import { InMemoryMatchStore, type MatchStore } from "./match-store.js";

export interface GameServerOptions {
  webOrigin: string;
  reconnectGraceMs?: number;
  inputCooldownMs?: number;
  logger?: boolean;
  matchStore?: MatchStore;
}

interface OperationalMetrics {
  startedAt: string;
  matchesCreated: number;
  matchesFinished: number;
  matchesCancelled: number;
  forfeits: number;
  reconnectsSucceeded: number;
  reconnectsExpired: number;
  persistenceFailures: number;
  recoveryFailures: number;
  errors: Record<string, number>;
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

type GameSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>;

export async function createGameServer(options: GameServerOptions): Promise<FastifyInstance> {
  const app = Fastify({ logger: options.logger ?? process.env.NODE_ENV !== "test" });
  await app.register(cors, { origin: options.webOrigin });
  const matchStore = options.matchStore ?? new InMemoryMatchStore();
  const metrics: OperationalMetrics = {
    startedAt: new Date().toISOString(),
    matchesCreated: 0,
    matchesFinished: 0,
    matchesCancelled: 0,
    forfeits: 0,
    reconnectsSucceeded: 0,
    reconnectsExpired: 0,
    persistenceFailures: 0,
    recoveryFailures: 0,
    errors: {},
  };
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
    cors: { origin: options.webOrigin },
    maxHttpBufferSize: 1_600_000,
  });
  app.get("/metrics", async () => structuredClone(metrics));
  const registry = new MatchRegistry();
  const sessionsByToken = new Map<string, GuestSession>();
  const sessionsByPlayer = new Map<string, GuestSession>();
  const reconnectTimers = new Map<string, ReturnType<typeof setTimeout>>();
  const persistedMatches = new Set<string>();
  const runtimeWrites = new Map<string, Promise<void>>();
  const recordedTerminalMatches = new Set<string>();
  const processedActions = new Map<string, Set<string>>();
  const lastInputAtByPlayer = new Map<string, number>();
  const reconnectGraceMs =
    options.reconnectGraceMs ?? GAME_CONFIG.reconnectGraceSeconds * 1_000;
  const inputCooldownMs = options.inputCooldownMs ?? 120;
  let waitingPlayer: { playerId: string; socketId: string; nickname: string } | null = null;

  function createSession(): GuestSession {
    const session: GuestSession = {
      guestToken: randomUUID(),
      playerId: randomUUID(),
      nickname: null,
      socketId: null,
    };
    sessionsByToken.set(session.guestToken, session);
    sessionsByPlayer.set(session.playerId, session);
    void matchStore.upsertGuest(session).catch((error) => app.log.error(error));
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
    recordTerminalMatch(match);
    void persistRuntime(match);
  }

  function recordTerminalMatch(match: GameMatch): void {
    if (
      recordedTerminalMatches.has(match.matchId) ||
      (match.currentState !== "FINISHED" && match.currentState !== "CANCELLED")
    ) return;
    recordedTerminalMatches.add(match.matchId);
    if (match.currentState === "CANCELLED") metrics.matchesCancelled += 1;
    else metrics.matchesFinished += 1;
    app.log.info({ event: "match_terminal", matchId: match.matchId, state: match.currentState });
  }

  function persistRuntime(match: GameMatch): Promise<void> {
    const matchId = match.matchId;
    const state = match.currentState === "FINISHED" || match.currentState === "CANCELLED"
      ? null
      : match.serialize();
    const previous = runtimeWrites.get(matchId) ?? Promise.resolve();
    const next = previous
      .catch(() => undefined)
      .then(async () => {
        if (state) await matchStore.saveActiveMatch(state);
        else await matchStore.deleteActiveMatch(matchId);
      })
      .catch((error) => {
        metrics.persistenceFailures += 1;
        app.log.error({ event: "runtime_persistence_failed", matchId, error });
      });
    runtimeWrites.set(matchId, next);
    void next.finally(() => {
      if (runtimeWrites.get(matchId) === next) runtimeWrites.delete(matchId);
    });
    return next;
  }

  async function persistIfFinished(match: GameMatch): Promise<void> {
    if (
      persistedMatches.has(match.matchId) ||
      (match.currentState !== "FINISHED" && match.currentState !== "CANCELLED")
    ) {
      return;
    }
    try {
      await matchStore.saveMatch(match.snapshot());
      persistedMatches.add(match.matchId);
    } catch (error) {
      metrics.persistenceFailures += 1;
      app.log.error({ event: "match_persistence_failed", matchId: match.matchId, error });
    }
  }

  function emitGameError(socket: GameSocket, error: unknown): void {
    if (error instanceof GameRuleError) {
      metrics.errors[error.code] = (metrics.errors[error.code] ?? 0) + 1;
      socket.emit("game:error", { code: error.code, message: error.message });
      app.log.warn({ event: "game_rule_error", code: error.code, playerId: socket.data.playerId });
      return;
    }
    metrics.errors.INTERNAL_ERROR = (metrics.errors.INTERNAL_ERROR ?? 0) + 1;
    socket.emit("game:error", {
      code: "INTERNAL_ERROR",
      message: "경기 처리 중 오류가 발생했습니다.",
    });
    app.log.error({ event: "game_internal_error", playerId: socket.data.playerId, error });
  }

  function handleActionError(socket: GameSocket, matchId: string, error: unknown): void {
    if (error instanceof GameRuleError) {
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
  ): void {
    const current = match.snapshot(playerId);
    if (
      current.state !== expectedState ||
      !Number.isInteger(expectedStateVersion) ||
      expectedStateVersion < 0 ||
      expectedStateVersion > current.stateVersion
    ) {
      throw new GameRuleError("STALE_STATE", "경기 상태가 변경되었습니다. 최신 상태에서 다시 시도해주세요.");
    }
  }

  function invalidInput(message = "요청 형식이 올바르지 않습니다."): never {
    throw new GameRuleError("INVALID_INPUT", message);
  }

  function asRecord(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== "object" || Array.isArray(value)) return invalidInput();
    return value as Record<string, unknown>;
  }

  function asString(value: unknown, field: string, maxLength = 100): string {
    if (typeof value !== "string" || value.length === 0 || value.length > maxLength) {
      return invalidInput(`${field} 값이 올바르지 않습니다.`);
    }
    return value;
  }

  function asPoint(value: unknown): NormalizedPoint {
    const point = asRecord(value);
    if (
      typeof point.x !== "number" || !Number.isFinite(point.x) || point.x < 0 || point.x > 1 ||
      typeof point.y !== "number" || !Number.isFinite(point.y) || point.y < 0 || point.y > 1
    ) return invalidInput("좌표가 올바르지 않습니다.");
    return { x: point.x, y: point.y };
  }

  function asDifferences(value: unknown): Difference[] {
    if (!Array.isArray(value) || value.length !== GAME_CONFIG.differenceCount) {
      return invalidInput("차이점 데이터가 올바르지 않습니다.");
    }
    for (const item of value) {
      const difference = asRecord(item);
      asString(difference.id, "차이점 ID", 100);
      if (!(["ADD", "COVER", "COLOR", "DRAW"] as unknown[]).includes(difference.kind)) invalidInput();
      const region = asRecord(difference.region);
      asPoint(region);
      if (typeof region.radius !== "number" || !Number.isFinite(region.radius)) invalidInput();
    }
    return value as Difference[];
  }

  function parseAction(payload: unknown): {
    record: Record<string, unknown>;
    matchId: string;
    actionId: string;
    expectedState: GameState;
    expectedStateVersion: number;
  } {
    const record = asRecord(payload);
    const expectedState = record.expectedState;
    if (!(["READY", "EDITING", "FINDING", "FINISHED", "CANCELLED"] as unknown[]).includes(expectedState)) {
      return invalidInput("경기 상태가 올바르지 않습니다.");
    }
    if (!Number.isInteger(record.expectedStateVersion) || (record.expectedStateVersion as number) < 0) {
      return invalidInput("경기 상태 버전이 올바르지 않습니다.");
    }
    return {
      record,
      matchId: asString(record.matchId, "경기 ID", 100),
      actionId: asString(record.actionId, "요청 ID", 100),
      expectedState: expectedState as GameState,
      expectedStateVersion: record.expectedStateVersion as number,
    };
  }

  function claimAction(playerId: string, actionId: string): void {
    const actions = processedActions.get(playerId) ?? new Set<string>();
    if (actions.has(actionId)) throw new GameRuleError("DUPLICATE_ACTION", "이미 처리한 요청입니다.");
    actions.add(actionId);
    if (actions.size > 200) actions.delete(actions.values().next().value!);
    processedActions.set(playerId, actions);
  }

  function resumeMatch(socket: GameSocket, session: GuestSession): void {
    const match = registry.getCurrentForPlayer(session.playerId);
    if (!match) return;
    const snapshot = match.snapshot(session.playerId);
    const opponent = snapshot.players.find((player) => player.playerId !== session.playerId);
    socket.join(`match:${match.matchId}`);
    match.setConnectionStatus(session.playerId, "CONNECTED");
    metrics.reconnectsSucceeded += 1;
    app.log.info({ event: "match_reconnected", matchId: match.matchId, playerId: session.playerId });
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
      metrics.reconnectsExpired += 1;
      metrics.forfeits += 1;
      app.log.info({ event: "reconnect_expired", matchId: match.matchId, playerId: session.playerId });
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
      const match = registry.restore(state);
      if (match.expire(Date.now())) {
        emitSnapshots(match);
        void persistIfFinished(match);
        continue;
      }
      for (const player of state.players) {
        match.setConnectionStatus(player.playerId, "RECONNECTING");
        const session = sessionsByPlayer.get(player.playerId);
        if (session) scheduleForfeit(session);
      }
      void persistRuntime(match);
    }
  } catch (error) {
    metrics.recoveryFailures += 1;
    app.log.error({ event: "runtime_recovery_failed", error });
  }

  io.on("connection", (socket) => {
    const enforceCooldown = () => {
      if (inputCooldownMs <= 0) return;
      const now = Date.now();
      const previous = lastInputAtByPlayer.get(session.playerId) ?? 0;
      if (now - previous < inputCooldownMs) {
        throw new GameRuleError("INPUT_RATE_LIMITED", "입력이 너무 빠릅니다. 잠시 후 다시 시도해주세요.");
      }
      lastInputAtByPlayer.set(session.playerId, now);
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
      let nickname: string;
      try {
        nickname = asString(asRecord(payload).nickname, "닉네임", 16);
      } catch (error) {
        emitGameError(socket, error);
        return;
      }
      const normalizedNickname = nickname.trim().slice(0, 16);
      if (normalizedNickname.length < 2) {
        socket.emit("game:error", {
          code: "INVALID_NICKNAME",
          message: "닉네임은 2자 이상이어야 합니다.",
        });
        return;
      }
      session.nickname = normalizedNickname;
      void matchStore.upsertGuest(session).catch((error) => app.log.error(error));

      if (!waitingPlayer || waitingPlayer.playerId === session.playerId) {
        waitingPlayer = {
          playerId: session.playerId,
          socketId: socket.id,
          nickname: normalizedNickname,
        };
        return;
      }

      const opponentSocket = io.sockets.sockets.get(waitingPlayer.socketId);
      if (!opponentSocket) {
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
      metrics.matchesCreated += 1;
      app.log.info({ event: "match_created", matchId });

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
    });

    socket.on("queue:leave", () => {
      if (waitingPlayer?.playerId === session.playerId) waitingPlayer = null;
      socket.emit("queue:left");
    });

    socket.on("game:ready", (payload) => {
      let matchId = "";
      try {
        matchId = asString(asRecord(payload).matchId, "경기 ID", 100);
        const match = registry.getForPlayer(matchId, session.playerId);
        match.markReady(session.playerId, Date.now());
        emitSnapshots(match);
      } catch (error) {
        handleActionError(socket, matchId, error);
      }
    });

    socket.on("game:submit", (payload) => {
      let matchId = "";
      try {
        const parsed = parseAction(payload);
        ({ matchId } = parsed);
        const { record, actionId, expectedState, expectedStateVersion } = parsed;
        const match = registry.getForPlayer(matchId, session.playerId);
        assertClientState(match, session.playerId, expectedState, expectedStateVersion);
        const differences = asDifferences(record.differences);
        const problemImageDataUrl = asString(record.problemImageDataUrl, "문제 이미지", 1_500_000);
        if (!/^data:image\/(?:webp|png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(problemImageDataUrl)) invalidInput("문제 이미지 형식이 올바르지 않습니다.");
        claimAction(session.playerId, actionId);
        match.submitDifferences(session.playerId, differences, Date.now(), problemImageDataUrl);
        emitSnapshots(match);
      } catch (error) {
        handleActionError(socket, matchId, error);
      }
    });

    socket.on("game:guess", (payload) => {
      let matchId = "";
      try {
        const parsed = parseAction(payload);
        ({ matchId } = parsed);
        const { record, actionId, expectedState, expectedStateVersion } = parsed;
        const match = registry.getForPlayer(matchId, session.playerId);
        assertClientState(match, session.playerId, expectedState, expectedStateVersion);
        enforceCooldown();
        const point = asPoint(record.point);
        claimAction(session.playerId, actionId);
        socket.emit(
          "game:guess-result",
          match.guess(session.playerId, point, Date.now()),
        );
        emitSnapshots(match);
        void persistIfFinished(match);
      } catch (error) {
        handleActionError(socket, matchId, error);
      }
    });

    socket.on("game:hint", (payload) => {
      let matchId = "";
      try {
        const parsed = parseAction(payload);
        ({ matchId } = parsed);
        const { actionId, expectedState, expectedStateVersion } = parsed;
        const match = registry.getForPlayer(matchId, session.playerId);
        assertClientState(match, session.playerId, expectedState, expectedStateVersion);
        enforceCooldown();
        claimAction(session.playerId, actionId);
        socket.emit("game:hint-result", match.useHint(session.playerId, Date.now()));
        emitSnapshots(match);
      } catch (error) {
        handleActionError(socket, matchId, error);
      }
    });

    socket.on("game:forfeit", (payload) => {
      let matchId = "";
      try {
        const parsed = parseAction(payload);
        ({ matchId } = parsed);
        const { actionId, expectedState, expectedStateVersion } = parsed;
        const match = registry.getForPlayer(matchId, session.playerId);
        assertClientState(match, session.playerId, expectedState, expectedStateVersion);
        claimAction(session.playerId, actionId);
        metrics.forfeits += 1;
        match.forfeit(session.playerId);
        emitSnapshots(match);
        void persistIfFinished(match);
      } catch (error) {
        handleActionError(socket, matchId, error);
      }
    });

    socket.on("game:report", async (payload) => {
      try {
        const { record, matchId, actionId, expectedState, expectedStateVersion } = parseAction(payload);
        const match = registry.getForPlayer(matchId, session.playerId);
        assertClientState(match, session.playerId, expectedState, expectedStateVersion);
        if (match.currentState !== "FINISHED" && match.currentState !== "CANCELLED") {
          throw new GameRuleError("MATCH_NOT_FINISHED", "경기 종료 후 신고할 수 있습니다.");
        }
        const reason = asString(record.reason, "신고 사유", 30);
        if (!["UNFAIR", "INAPPROPRIATE", "SYSTEM_ERROR", "OTHER"].includes(reason)) invalidInput();
        const details = record.details === undefined ? undefined : asString(record.details, "신고 내용", 500);
        claimAction(session.playerId, actionId);
        await persistIfFinished(match);
        const reportId = await matchStore.createReport({
          matchId,
          reporterPlayerId: session.playerId,
          reason: reason as "UNFAIR" | "INAPPROPRIATE" | "SYSTEM_ERROR" | "OTHER",
          details: details?.trim().slice(0, 500),
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
      scheduleForfeit(session);
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
    clearInterval(expiryTimer);
    for (const timer of reconnectTimers.values()) clearTimeout(timer);
    io.close();
    await Promise.allSettled(runtimeWrites.values());
    await matchStore.close();
  });

  return app;
}
