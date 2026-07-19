import type {
  ClientToServerEvents,
  GameSnapshot,
  MatchFoundPayload,
  SessionReadyPayload,
  ServerToClientEvents,
} from "@spot-battle/shared";
import type { AddressInfo } from "node:net";
import { Pool } from "pg";
import { io as createClient, type Socket } from "socket.io-client";
import { describe, expect, it } from "vitest";
import { PostgresMatchStore } from "../src/match-store.js";
import { createGameServer } from "../src/server.js";

type TestSocket = Socket<ServerToClientEvents, ClientToServerEvents>;
const databaseUrl = process.env.DATABASE_URL;
const describeDatabase = databaseUrl ? describe : describe.skip;

function once<T>(socket: TestSocket, event: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`${event} event timed out`)), 5_000);
    socket.once(event as never, ((payload: T) => {
      clearTimeout(timeout);
      resolve(payload);
    }) as never);
  });
}

function waitForState(socket: TestSocket, state: GameSnapshot["state"]): Promise<GameSnapshot> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`${state} state timed out`)), 5_000);
    const listener = (snapshot: GameSnapshot) => {
      if (snapshot.state !== state) return;
      clearTimeout(timeout);
      socket.off("game:snapshot", listener);
      resolve(snapshot);
    };
    socket.on("game:snapshot", listener);
  });
}

describeDatabase("PostgreSQL restart recovery", () => {
  it("restores guest identities and an active match in a new server instance", async () => {
    const sockets: TestSocket[] = [];
    const pool = new Pool({ connectionString: databaseUrl });
    const playerIds: string[] = [];
    let matchId: string | null = null;
    let firstApp = await createGameServer({
      webOrigin: "http://localhost:5173",
      matchStore: new PostgresMatchStore(databaseUrl!),
      reconnectGraceMs: 10_000,
    });
    await firstApp.listen({ host: "127.0.0.1", port: 0 });
    let secondApp: Awaited<ReturnType<typeof createGameServer>> | null = null;

    try {
      const firstPort = (firstApp.server.address() as AddressInfo).port;
      const first = createClient(`http://127.0.0.1:${firstPort}`) as TestSocket;
      const second = createClient(`http://127.0.0.1:${firstPort}`) as TestSocket;
      sockets.push(first, second);
      const firstSessionPromise = once<SessionReadyPayload>(first, "session:ready");
      const secondSessionPromise = once<SessionReadyPayload>(second, "session:ready");
      await Promise.all([once(first, "connect"), once(second, "connect")]);
      const [firstSession, secondSession] = await Promise.all([
        firstSessionPromise,
        secondSessionPromise,
      ]);
      playerIds.push(firstSession.playerId, secondSession.playerId);

      const firstFound = once<MatchFoundPayload>(first, "match:found");
      const secondFound = once<MatchFoundPayload>(second, "match:found");
      first.emit("queue:join", { nickname: "재시작첫째" });
      second.emit("queue:join", { nickname: "재시작둘째" });
      const [firstMatch, secondMatch] = await Promise.all([firstFound, secondFound]);
      matchId = firstMatch.matchId;

      const editing = waitForState(first, "EDITING");
      first.emit("game:ready", { matchId: firstMatch.matchId });
      second.emit("game:ready", { matchId: secondMatch.matchId });
      await editing;
      await new Promise((resolve) => setTimeout(resolve, 50));
      first.disconnect();
      second.disconnect();
      await firstApp.close();

      secondApp = await createGameServer({
        webOrigin: "http://localhost:5173",
        matchStore: new PostgresMatchStore(databaseUrl!),
        reconnectGraceMs: 10_000,
      });
      await secondApp.listen({ host: "127.0.0.1", port: 0 });
      const secondPort = (secondApp.server.address() as AddressInfo).port;
      const restored = createClient(`http://127.0.0.1:${secondPort}`, {
        auth: { guestToken: firstSession.guestToken },
      }) as TestSocket;
      sockets.push(restored);
      const restoredSession = once<SessionReadyPayload>(restored, "session:ready");
      const restoredMatch = once<MatchFoundPayload>(restored, "match:found");
      const restoredEditing = waitForState(restored, "EDITING");

      await once(restored, "connect");
      await expect(restoredSession).resolves.toMatchObject({ playerId: firstSession.playerId });
      await expect(restoredMatch).resolves.toMatchObject({ matchId: firstMatch.matchId });
      await expect(restoredEditing).resolves.toMatchObject({ state: "EDITING" });
    } finally {
      for (const socket of sockets) socket.disconnect();
      if (secondApp) await secondApp.close();
      else await firstApp.close();
      if (matchId) await pool.query("DELETE FROM active_matches WHERE match_id = $1", [matchId]);
      if (playerIds.length) await pool.query("DELETE FROM guest_sessions WHERE player_id = ANY($1::uuid[])", [playerIds]);
      await pool.end();
    }
  });
});
