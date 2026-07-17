import cors from "@fastify/cors";
import { GameMatch, GameRuleError } from "@spot-battle/game-core";
import type { ClientToServerEvents, ServerToClientEvents } from "@spot-battle/shared";
import Fastify, { type FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import { Server, type Socket } from "socket.io";
import { MatchRegistry } from "./match-registry.js";

export interface GameServerOptions {
  webOrigin: string;
}

export async function createGameServer(options: GameServerOptions): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  await app.register(cors, { origin: options.webOrigin });
  app.get("/health", async () => ({ status: "ok" }));

  const io = new Server<ClientToServerEvents, ServerToClientEvents>(app.server, {
    cors: { origin: options.webOrigin },
  });
  const registry = new MatchRegistry();
  let waitingPlayer: { socketId: string; nickname: string } | null = null;

  function emitSnapshots(match: GameMatch): void {
    for (const player of match.snapshot().players) {
      io.to(player.playerId).emit("game:snapshot", match.snapshot(player.playerId));
    }
  }

  function emitGameError(
    socket: Socket<ClientToServerEvents, ServerToClientEvents>,
    error: unknown,
  ): void {
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

  io.on("connection", (socket) => {
    socket.on("queue:join", ({ nickname }) => {
      const normalizedNickname = nickname.trim().slice(0, 16);
      if (!normalizedNickname) return;

      if (!waitingPlayer || waitingPlayer.socketId === socket.id) {
        waitingPlayer = { socketId: socket.id, nickname: normalizedNickname };
        return;
      }

      const opponent = io.sockets.sockets.get(waitingPlayer.socketId);
      if (!opponent) {
        waitingPlayer = { socketId: socket.id, nickname: normalizedNickname };
        return;
      }

      const matchId = randomUUID();
      const room = `match:${matchId}`;
      socket.join(room);
      opponent.join(room);
      const match = registry.create(matchId, [
        { playerId: opponent.id, nickname: waitingPlayer.nickname },
        { playerId: socket.id, nickname: normalizedNickname },
      ]);

      socket.emit("match:found", {
        matchId,
        playerId: socket.id,
        opponentNickname: waitingPlayer.nickname,
      });
      opponent.emit("match:found", {
        matchId,
        playerId: opponent.id,
        opponentNickname: normalizedNickname,
      });
      emitSnapshots(match);
      waitingPlayer = null;
    });

    socket.on("queue:leave", () => {
      if (waitingPlayer?.socketId === socket.id) waitingPlayer = null;
      socket.emit("queue:left");
    });

    socket.on("game:ready", ({ matchId }) => {
      try {
        const match = registry.getForPlayer(matchId, socket.id);
        match.markReady(socket.id, Date.now());
        emitSnapshots(match);
      } catch (error) {
        emitGameError(socket, error);
      }
    });

    socket.on("game:submit", ({ matchId, differences }) => {
      try {
        const match = registry.getForPlayer(matchId, socket.id);
        match.submitDifferences(socket.id, differences, Date.now());
        emitSnapshots(match);
      } catch (error) {
        emitGameError(socket, error);
      }
    });

    socket.on("game:guess", ({ matchId, point }) => {
      try {
        const match = registry.getForPlayer(matchId, socket.id);
        socket.emit("game:guess-result", match.guess(socket.id, point, Date.now()));
        emitSnapshots(match);
      } catch (error) {
        emitGameError(socket, error);
      }
    });

    socket.on("game:hint", ({ matchId }) => {
      try {
        const match = registry.getForPlayer(matchId, socket.id);
        socket.emit("game:hint-result", match.useHint(socket.id, Date.now()));
        emitSnapshots(match);
      } catch (error) {
        emitGameError(socket, error);
      }
    });

    socket.on("disconnect", () => {
      if (waitingPlayer?.socketId === socket.id) waitingPlayer = null;
    });
  });

  const expiryTimer = setInterval(() => {
    for (const match of registry.expire(Date.now())) {
      emitSnapshots(match);
    }
  }, 250);
  expiryTimer.unref();

  app.addHook("onClose", async () => {
    clearInterval(expiryTimer);
    io.close();
  });

  return app;
}
