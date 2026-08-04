import type { ClientToServerEvents, GameErrorPayload, GameSnapshot, MatchFoundPayload, ServerToClientEvents } from "@spot-battle/shared";
import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { io as createClient, type Socket } from "socket.io-client";
import { createGameServer } from "../src/server.js";

type TestSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

function waitForEvent<T>(socket: TestSocket, event: string, predicate: (value: T) => boolean = () => true): Promise<T> {
  return new Promise((resolve) => {
    const listener = (value: T) => {
      if (!predicate(value)) return;
      socket.off(event as never, listener as never);
      resolve(value);
    };
    socket.on(event as never, listener as never);
  });
}

function waitForState(socket: TestSocket, state: GameSnapshot["state"]): Promise<GameSnapshot> {
  return waitForEvent<GameSnapshot>(socket, "game:snapshot", (snapshot) => snapshot.state === state);
}

describe("simultaneous game server", () => {
  let app: Awaited<ReturnType<typeof createGameServer>>;
  const sockets: TestSocket[] = [];

  beforeEach(async () => {
    app = await createGameServer({ sceneId: "enchanted-forest", inputCooldownMs: 0 });
    await app.listen({ host: "127.0.0.1", port: 0 });
  });

  afterEach(async () => {
    for (const socket of sockets) socket.disconnect();
    await app.close();
  });

  async function connect(): Promise<TestSocket> {
    const { port } = app.server.address() as AddressInfo;
    const socket: TestSocket = createClient(`http://127.0.0.1:${port}`, { forceNew: true, transports: ["websocket"], autoConnect: false });
    sockets.push(socket);
    const ready = waitForEvent(socket, "session:ready");
    socket.connect();
    await ready;
    return socket;
  }

  it("starts both players together, allows independent guesses, and declares the first clear winner", async () => {
    const first = await connect();
    const second = await connect();
    const firstFound = waitForEvent<MatchFoundPayload>(first, "match:found");
    const secondFound = waitForEvent<MatchFoundPayload>(second, "match:found");
    first.emit("queue:join", { nickname: "첫째" });
    second.emit("queue:join", { nickname: "둘째" });
    const [firstMatch, secondMatch] = await Promise.all([firstFound, secondFound]);
    expect(firstMatch.matchId).toBe(secondMatch.matchId);

    const firstPreloading = waitForState(first, "PRELOADING");
    const secondPreloading = waitForState(second, "PRELOADING");
    first.emit("game:ready", { matchId: firstMatch.matchId });
    second.emit("game:ready", { matchId: firstMatch.matchId });
    const [firstLoad, secondLoad] = await Promise.all([firstPreloading, secondPreloading]);
    expect(firstLoad.currentPuzzleId).toBe("enchanted-forest");

    const firstCountdown = waitForState(first, "COUNTDOWN");
    const secondCountdown = waitForState(second, "COUNTDOWN");
    first.emit("game:loaded", { matchId: firstMatch.matchId, puzzleId: "enchanted-forest" });
    second.emit("game:loaded", { matchId: firstMatch.matchId, puzzleId: "enchanted-forest" });
    await Promise.all([firstCountdown, secondCountdown]);

    const [firstPlaying, secondPlaying] = await Promise.all([waitForState(first, "PLAYING"), waitForState(second, "PLAYING")]);
    const context = { expectedState: "PLAYING" as const, expectedStateVersion: firstPlaying.stateVersion };
    const malformedError = waitForEvent<GameErrorPayload>(first, "game:error", (error) => error.code === "INVALID_POINT");
    first.emit("game:guess", {
      matchId: firstMatch.matchId,
      puzzleId: "enchanted-forest",
      point: null,
      ...context,
    } as never);
    await expect(malformedError).resolves.toMatchObject({ code: "INVALID_POINT" });

    const requeueError = waitForEvent<GameErrorPayload>(first, "game:error", (error) => error.code === "ALREADY_IN_MATCH");
    first.emit("queue:join", { nickname: "재매칭시도" });
    await expect(requeueError).resolves.toMatchObject({ code: "ALREADY_IN_MATCH" });
    second.emit("game:guess", { matchId: firstMatch.matchId, puzzleId: "enchanted-forest", point: { x: 0.31, y: 0.13 }, ...context });
    const secondProgress = await waitForEvent<GameSnapshot>(second, "game:snapshot", (snapshot) => snapshot.players.some((player) => player.playerId === secondMatch.playerId && player.foundCount === 1));
    expect(secondProgress.foundMarks).toHaveLength(1);
    expect(firstPlaying.foundMarks).toHaveLength(0);

    const finishedFirst = waitForState(first, "FINISHED");
    const finishedSecond = waitForState(second, "FINISHED");
    for (const point of [{ x: 0.31, y: 0.13 }, { x: 0.23, y: 0.66 }, { x: 0.08, y: 0.84 }]) {
      first.emit("game:guess", { matchId: firstMatch.matchId, puzzleId: "enchanted-forest", point, ...context });
    }
    const [firstResult, secondResult] = await Promise.all([finishedFirst, finishedSecond]);
    expect(firstResult).toMatchObject({ winnerId: firstMatch.playerId, endReason: "COMPLETED" });
    expect(secondResult.winnerId).toBe(firstMatch.playerId);
  }, 15_000);
});
