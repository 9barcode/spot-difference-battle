import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import { GameMatch, GameRuleError } from "@spot-battle/game-core";
import {
  GAME_CONFIG,
  PROBLEM_IMAGE_LIMITS,
  type ClientToServerEvents,
  type GameSceneId,
  type ServerToClientEvents,
} from "@spot-battle/shared";
import Fastify, { type FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import { Server, type Socket } from "socket.io";
import {
  defaultSceneOverride,
  loadGameSceneOriginals,
  type GameSceneImageOverrides,
} from "./game-scenes.js";
import { MatchRegistry } from "./match-registry.js";
import { InMemoryMatchStore, type MatchStore } from "./match-store.js";
import { validateProblemImageCoordinates } from "./problem-image-validation.js";
import { validateSceneObjectEdits } from "./scene-validation.js";

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
  const originalProblemImages = await loadGameSceneOriginals(
    {
      ...defaultSceneOverride(options.originalProblemImage),
      ...options.originalProblemImages,
    },
    options.gameAssetRoot,
  );
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
    // 제작자가 렌더한 문제 이미지가 오간다. 게임 코어가 다시 한 번 용량을 검증한다.
    maxHttpBufferSize: PROBLEM_IMAGE_LIMITS.maxBytes + 256 * 1024,
  });
  const registry = new MatchRegistry(options.sceneId ? [options.sceneId] : undefined);
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
    void persistRuntime(match);
  }

  function persistRuntime(match: GameMatch): Promise<void> {
    const matchId = match.matchId;
    const state =
      match.currentState === "FINISHED" || match.currentState === "CANCELLED"
        ? null
        : match.serialize();
    const previous = runtimeWrites.get(matchId) ?? Promise.resolve();
    const next = previous
      .catch(() => undefined)
      .then(async () => {
        if (state) await matchStore.saveActiveMatch(state);
        else await matchStore.deleteActiveMatch(matchId);
      })
      .catch((error) => app.log.error(error));
    runtimeWrites.set(matchId, next);
    void next.finally(() => {
      if (runtimeWrites.get(matchId) === next) runtimeWrites.delete(matchId);
    });
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
      app.log.error(error);
    } finally {
      scheduleFinishedMatchCleanup(match);
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
      const match = registry.restore(state);
      if (match.expire(Date.now())) {
        await persistRuntime(match);
        await persistIfFinished(match);
        continue;
      }
      for (const player of state.players) {
        match.setConnectionStatus(player.playerId, "RECONNECTING");
        const session = sessionsByPlayer.get(player.playerId);
        if (session) scheduleForfeit(session);
      }
      await persistRuntime(match);
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

    socket.on("queue:join", ({ nickname }) => {
      const normalizedNickname = nickname.trim().slice(0, 16);
      if (normalizedNickname.length < 2) {
        socket.emit("game:error", {
          code: "INVALID_NICKNAME",
          message: "닉네임은 2자 이상이어야 합니다.",
        });
        return;
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

    socket.on("game:ready", ({ matchId }) => {
      try {
        const match = registry.getForPlayer(matchId, session.playerId);
        match.markReady(session.playerId, Date.now());
        emitSnapshots(match);
      } catch (error) {
        handleActionError(socket, matchId, error);
      }
    });

    socket.on("game:submit", async ({ matchId, differences, renderedImage, autoFilled, expectedState, expectedStateVersion }) => {
      try {
        const match = registry.getForPlayer(matchId, session.playerId);
        assertClientState(match, session.playerId, expectedState, expectedStateVersion, true);
        validateSceneObjectEdits(match.imageId, differences);
        const originalProblemImage = originalProblemImages.get(match.imageId);
        if (!originalProblemImage) {
          throw new GameRuleError(
            "UNKNOWN_GAME_SCENE",
            "경기 장면의 서버 원본을 찾을 수 없습니다.",
          );
        }
        try {
          validateProblemImageCoordinates(originalProblemImage, renderedImage, differences);
        } catch (error) {
          throw new GameRuleError(
            "INVALID_PROBLEM_COORDINATES",
            error instanceof Error ? error.message : "문제 이미지와 정답 좌표가 일치하지 않습니다.",
          );
        }
        match.submitDifferences(
          session.playerId,
          differences,
          renderedImage,
          Date.now(),
          Boolean(autoFilled),
        );
        emitSnapshots(match);
      } catch (error) {
        handleActionError(socket, matchId, error);
      }
    });

    socket.on("game:guess", ({ matchId, point, expectedState, expectedStateVersion }) => {
      try {
        const match = registry.getForPlayer(matchId, session.playerId);
        assertClientState(match, session.playerId, expectedState, expectedStateVersion);
        enforceCooldown("guess");
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

    socket.on("game:hint", ({ matchId, expectedState, expectedStateVersion }) => {
      try {
        const match = registry.getForPlayer(matchId, session.playerId);
        assertClientState(match, session.playerId, expectedState, expectedStateVersion);
        enforceCooldown("hint");
        socket.emit("game:hint-result", match.useHint(session.playerId, Date.now()));
        emitSnapshots(match);
      } catch (error) {
        handleActionError(socket, matchId, error);
      }
    });

    socket.on("game:forfeit", ({ matchId, expectedState, expectedStateVersion }) => {
      try {
        const match = registry.getForPlayer(matchId, session.playerId);
        assertClientState(match, session.playerId, expectedState, expectedStateVersion);
        match.forfeit(session.playerId);
        emitSnapshots(match);
        void persistIfFinished(match);
      } catch (error) {
        handleActionError(socket, matchId, error);
      }
    });

    socket.on("game:report", async ({ matchId, reason, details, expectedState, expectedStateVersion }) => {
      try {
        const match = registry.getForPlayer(matchId, session.playerId);
        assertClientState(match, session.playerId, expectedState, expectedStateVersion);
        if (match.currentState !== "FINISHED" && match.currentState !== "CANCELLED") {
          throw new GameRuleError("MATCH_NOT_FINISHED", "경기 종료 후 신고할 수 있습니다.");
        }
        await persistIfFinished(match);
        const reportId = await matchStore.createReport({
          matchId,
          reporterPlayerId: session.playerId,
          reason,
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
