import cors from "@fastify/cors";
import Fastify from "fastify";
import { randomUUID } from "node:crypto";
import { Server } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "@spot-battle/shared";

const host = process.env.HOST ?? "0.0.0.0";
const port = Number.parseInt(process.env.PORT ?? "3001", 10);
const webOrigin = process.env.WEB_ORIGIN ?? "http://localhost:5173";

const app = Fastify({ logger: true });
await app.register(cors, { origin: webOrigin });

app.get("/health", async () => ({ status: "ok" }));

const io = new Server<ClientToServerEvents, ServerToClientEvents>(app.server, {
  cors: { origin: webOrigin },
});

let waitingPlayer: { socketId: string; nickname: string } | null = null;

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

    socket.emit("match:found", { matchId, opponentNickname: waitingPlayer.nickname });
    opponent.emit("match:found", { matchId, opponentNickname: normalizedNickname });
    waitingPlayer = null;
  });

  socket.on("queue:leave", () => {
    if (waitingPlayer?.socketId === socket.id) waitingPlayer = null;
    socket.emit("queue:left");
  });

  socket.on("disconnect", () => {
    if (waitingPlayer?.socketId === socket.id) waitingPlayer = null;
  });
});

try {
  await app.listen({ host, port });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}

