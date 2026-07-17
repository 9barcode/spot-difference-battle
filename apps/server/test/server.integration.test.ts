import type {
  ClientToServerEvents,
  Difference,
  GameSnapshot,
  MatchFoundPayload,
  ServerToClientEvents,
} from "@spot-battle/shared";
import type { AddressInfo } from "node:net";
import { io as createClient, type Socket } from "socket.io-client";
import { afterEach, describe, expect, it } from "vitest";
import { createGameServer } from "../src/server.js";

type TestSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const differences: Difference[] = [
  { id: "a", kind: "ADD", region: { x: 0.2, y: 0.2, radius: 0.05 } },
  { id: "b", kind: "COVER", region: { x: 0.5, y: 0.5, radius: 0.05 } },
  { id: "c", kind: "COLOR", region: { x: 0.8, y: 0.8, radius: 0.05 } },
];

const sockets: TestSocket[] = [];

afterEach(() => {
  for (const socket of sockets.splice(0)) socket.disconnect();
});

function once<T>(socket: TestSocket, event: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`${event} event timed out`)), 3_000);
    socket.once(event as never, ((payload: T) => {
      clearTimeout(timeout);
      resolve(payload);
    }) as never);
  });
}

function waitForState(socket: TestSocket, state: GameSnapshot["state"]): Promise<GameSnapshot> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`${state} state timed out`)), 3_000);
    const listener = (snapshot: GameSnapshot) => {
      if (snapshot.state !== state) return;
      clearTimeout(timeout);
      socket.off("game:snapshot", listener);
      resolve(snapshot);
    };
    socket.on("game:snapshot", listener);
  });
}

describe("game server", () => {
  it("lets two clients complete a server-authoritative match", async () => {
    const app = await createGameServer({ webOrigin: "http://localhost:5173" });
    await app.listen({ host: "127.0.0.1", port: 0 });

    try {
      const port = (app.server.address() as AddressInfo).port;
      const first = createClient(`http://127.0.0.1:${port}`) as TestSocket;
      const second = createClient(`http://127.0.0.1:${port}`) as TestSocket;
      sockets.push(first, second);
      await Promise.all([once(first, "connect"), once(second, "connect")]);

      const firstFound = once<MatchFoundPayload>(first, "match:found");
      const secondFound = once<MatchFoundPayload>(second, "match:found");
      first.emit("queue:join", { nickname: "첫째" });
      second.emit("queue:join", { nickname: "둘째" });
      const [firstMatch, secondMatch] = await Promise.all([firstFound, secondFound]);
      expect(firstMatch.matchId).toBe(secondMatch.matchId);

      const editing = waitForState(first, "EDITING");
      first.emit("game:ready", { matchId: firstMatch.matchId });
      second.emit("game:ready", { matchId: secondMatch.matchId });
      await expect(editing).resolves.toMatchObject({ state: "EDITING" });

      const finding = waitForState(first, "FINDING");
      first.emit("game:submit", { matchId: firstMatch.matchId, differences });
      second.emit("game:submit", { matchId: secondMatch.matchId, differences });
      await expect(finding).resolves.toMatchObject({ state: "FINDING" });

      first.emit("game:guess", { matchId: firstMatch.matchId, point: { x: 0.2, y: 0.2 } });
      first.emit("game:guess", { matchId: firstMatch.matchId, point: { x: 0.5, y: 0.5 } });
      const finished = waitForState(first, "FINISHED");
      first.emit("game:guess", { matchId: firstMatch.matchId, point: { x: 0.8, y: 0.8 } });

      const result = await finished;
      expect(result).toMatchObject({ state: "FINISHED", winnerId: firstMatch.playerId });
      expect(result.players.find((player) => player.playerId === firstMatch.playerId)?.foundCount).toBe(3);
    } finally {
      for (const socket of sockets.splice(0)) socket.disconnect();
      await app.close();
    }
  });
});
