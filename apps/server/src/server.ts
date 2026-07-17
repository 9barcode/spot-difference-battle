import cors from "@fastify/cors";
import { GameMatch, GameRuleError } from "@spot-battle/game-core";
import { GAME_CONFIG, type ClientToServerEvents, type ServerToClientEvents } from "@spot-battle/shared";
import Fastify, { type FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import { Server, type Socket } from "socket.io";
import { MatchRegistry } from "./match-registry.js";
import { InMemoryMatchStore, type MatchStore } from "./match-store.js";

export interface GameServerOptions {
  webOrigin: string;
  reconnectGraceMs?: number;
  matchStore?: MatchStore;
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
  await app.register(cors, { origin: options.webOrigin });
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
  >(app.server, { cors: { origin: options.webOrigin } });
  const registry = new MatchRegistry();
  const sessionsByToken = new Map<string, GuestSession>();
  const sessionsByPlayer = new Map<string, GuestSession>();
  const reconnectTimers = new Map<string, ReturnType<typeof setTimeout>>();
  const persistedMatches = new Set<string>();
  const reconnectGraceMs =
    options.reconnectGraceMs ?? GAME_CONFIG.reconnectGraceSeconds * 1_000;
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

  io.on("connection", (socket) => {
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

    socket.on("game:submit", ({ matchId, differences }) => {
      try {
        const match = registry.getForPlayer(matchId, session.playerId);
        match.submitDifferences(session.playerId, differences, Date.now());
        emitSnapshots(match);
      } catch (error) {
        handleActionError(socket, matchId, error);
      }
    });

    socket.on("game:guess", ({ matchId, point }) => {
      try {
        const match = registry.getForPlayer(matchId, session.playerId);
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

    socket.on("game:hint", ({ matchId }) => {
      try {
        const match = registry.getForPlayer(matchId, session.playerId);
        socket.emit("game:hint-result", match.useHint(session.playerId, Date.now()));
        emitSnapshots(match);
      } catch (error) {
        handleActionError(socket, matchId, error);
      }
    });

    socket.on("game:forfeit", ({ matchId }) => {
      try {
        const match = registry.getForPlayer(matchId, session.playerId);
        match.forfeit(session.playerId);
        emitSnapshots(match);
        void persistIfFinished(match);
      } catch (error) {
        handleActionError(socket, matchId, error);
      }
    });

    socket.on("game:report", async ({ matchId, reason, details }) => {
      try {
        const match = registry.getForPlayer(matchId, session.playerId);
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
    await matchStore.close();
  });

  return app;
}
