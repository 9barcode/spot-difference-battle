import { GameMatch, type PersistedMatchState } from "@spot-battle/game-core";
import type { ClientToServerEvents, GameSnapshot, MatchFoundPayload, SessionReadyPayload, ServerToClientEvents } from "@spot-battle/shared";
import type { AddressInfo } from "node:net";
import { io as createClient, type Socket } from "socket.io-client";
import { expect, it } from "vitest";
import { GAME_PUZZLES } from "../src/game-puzzles.js";
import { InMemoryMatchStore } from "../src/match-store.js";
import { createGameServer } from "../src/server.js";

type TestSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

function once<T>(socket: TestSocket, event: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`${event} timed out`)), 5_000);
    socket.once(event as never, ((payload: T) => {
      clearTimeout(timeout);
      resolve(payload);
    }) as never);
  });
}

it("isolates an invalid active row and restores the following valid match", async () => {
  const store = new InMemoryMatchStore();
  store.guests.set("p1", { guestToken: "token-1", nickname: "첫째" });
  store.guests.set("p2", { guestToken: "token-2", nickname: "둘째" });
  store.activeMatches.set("legacy", {
    schemaVersion: 1,
    matchId: "legacy",
  } as unknown as PersistedMatchState);
  const valid = new GameMatch("valid-match", GAME_PUZZLES, [
    { playerId: "p1", nickname: "첫째" },
    { playerId: "p2", nickname: "둘째" },
  ]).serialize();
  store.activeMatches.set(valid.matchId, valid);

  const app = await createGameServer({ matchStore: store, reconnectGraceMs: 10_000 });
  await app.listen({ host: "127.0.0.1", port: 0 });
  const { port } = app.server.address() as AddressInfo;
  const socket = createClient(`http://127.0.0.1:${port}`, {
    auth: { guestToken: "token-1" },
    autoConnect: false,
    forceNew: true,
    transports: ["websocket"],
  }) as TestSocket;

  try {
    const session = once<SessionReadyPayload>(socket, "session:ready");
    const found = once<MatchFoundPayload>(socket, "match:found");
    const snapshot = once<GameSnapshot>(socket, "game:snapshot");
    socket.connect();
    await expect(session).resolves.toMatchObject({ playerId: "p1" });
    await expect(found).resolves.toMatchObject({ matchId: valid.matchId });
    await expect(snapshot).resolves.toMatchObject({ matchId: valid.matchId, state: "READY" });
    expect(store.activeMatches.has("legacy")).toBe(false);
  } finally {
    socket.disconnect();
    await app.close();
  }
});