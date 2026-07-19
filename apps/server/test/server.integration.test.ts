import type {
  ClientToServerEvents,
  Difference,
  GameSnapshot,
  GameErrorPayload,
  MatchFoundPayload,
  SessionReadyPayload,
  ServerToClientEvents,
} from "@spot-battle/shared";
import type { AddressInfo } from "node:net";
import { io as createClient, type Socket } from "socket.io-client";
import { afterEach, describe, expect, it } from "vitest";
import { createGameServer } from "../src/server.js";
import { InMemoryMatchStore } from "../src/match-store.js";

type TestSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const differences: Difference[] = [
  { id: "a", kind: "ADD", region: { x: 0.2, y: 0.2, radius: 0.05 } },
  { id: "b", kind: "COVER", region: { x: 0.5, y: 0.5, radius: 0.05 } },
  { id: "c", kind: "COLOR", region: { x: 0.8, y: 0.8, radius: 0.05 } },
];
const problemImageDataUrl = "data:image/png;base64,AA==";

function actionContext(snapshot: Pick<GameSnapshot, "state" | "stateVersion">) {
  return {
    actionId: crypto.randomUUID(),
    expectedState: snapshot.state,
    expectedStateVersion: snapshot.stateVersion,
  };
}

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

function waitForNewerVersion(socket: TestSocket, stateVersion: number): Promise<GameSnapshot> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("newer snapshot timed out")), 3_000);
    const listener = (snapshot: GameSnapshot) => {
      if (snapshot.stateVersion <= stateVersion) return;
      clearTimeout(timeout);
      socket.off("game:snapshot", listener);
      resolve(snapshot);
    };
    socket.on("game:snapshot", listener);
  });
}

function waitForProgress(
  socket: TestSocket,
  predicate: (snapshot: GameSnapshot) => boolean,
): Promise<GameSnapshot> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("progress snapshot timed out")), 3_000);
    const listener = (snapshot: GameSnapshot) => {
      if (!predicate(snapshot)) return;
      clearTimeout(timeout);
      socket.off("game:snapshot", listener);
      resolve(snapshot);
    };
    socket.on("game:snapshot", listener);
  });
}

function waitForConnection(
  socket: TestSocket,
  playerId: string,
  status: "CONNECTED" | "RECONNECTING" | "FORFEITED",
): Promise<GameSnapshot> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`${status} connection timed out`)), 3_000);
    const listener = (snapshot: GameSnapshot) => {
      const player = snapshot.players.find((candidate) => candidate.playerId === playerId);
      if (player?.connectionStatus !== status) return;
      clearTimeout(timeout);
      socket.off("game:snapshot", listener);
      resolve(snapshot);
    };
    socket.on("game:snapshot", listener);
  });
}

describe("game server", () => {
  it("lets two clients complete a server-authoritative match", async () => {
    const matchStore = new InMemoryMatchStore();
    const app = await createGameServer({
      webOrigin: "http://localhost:5173",
      matchStore,
      inputCooldownMs: 0,
    });
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
      const editingSnapshot = await editing;
      expect(editingSnapshot).toMatchObject({ state: "EDITING" });

      const finding = waitForState(first, "FINDING");
      first.emit("game:submit", { matchId: firstMatch.matchId, differences, problemImageDataUrl, ...actionContext(editingSnapshot) });
      second.emit("game:submit", { matchId: secondMatch.matchId, differences, problemImageDataUrl, ...actionContext(editingSnapshot) });
      const findingSnapshot = await finding;
      expect(findingSnapshot).toMatchObject({ state: "FINDING" });
      expect(findingSnapshot.problemImageDataUrl).toBe(problemImageDataUrl);
      expect(findingSnapshot).not.toHaveProperty("problem");

      const invalidError = once<GameErrorPayload>(first, "game:error");
      first.emit("game:guess", {
        matchId: firstMatch.matchId,
        point: null,
        ...actionContext(findingSnapshot),
      } as never);
      await expect(invalidError).resolves.toMatchObject({ code: "INVALID_INPUT" });

      const staleError = once<GameErrorPayload>(first, "game:error");
      first.emit("game:hint", {
        matchId: firstMatch.matchId,
        actionId: crypto.randomUUID(),
        expectedState: "EDITING",
        expectedStateVersion: editingSnapshot.stateVersion,
      });
      await expect(staleError).resolves.toMatchObject({ code: "STALE_STATE" });

      const delayedGuess = {
        matchId: firstMatch.matchId,
        point: { x: 0.2, y: 0.2 },
        ...actionContext(findingSnapshot),
      };
      const bothFoundOne = waitForProgress(first, (snapshot) =>
        snapshot.players.every((player) => player.foundCount === 1),
      );
      const secondGuessResult = once(second, "game:guess-result");
      second.emit("game:guess", {
        matchId: secondMatch.matchId,
        point: { x: 0.2, y: 0.2 },
        ...actionContext(findingSnapshot),
      });
      await secondGuessResult;
      await new Promise((resolve) => setTimeout(resolve, 50));
      const firstGuessResult = once(first, "game:guess-result");
      first.emit("game:guess", delayedGuess);
      await firstGuessResult;
      const afterConcurrentGuesses = await bothFoundOne;

      const duplicateActionError = once<GameErrorPayload>(first, "game:error");
      first.emit("game:guess", delayedGuess);
      await expect(duplicateActionError).resolves.toMatchObject({ code: "DUPLICATE_ACTION" });

      let findingContext = actionContext(afterConcurrentGuesses);
      let nextSnapshot = waitForNewerVersion(first, findingContext.expectedStateVersion);
      first.emit("game:guess", { matchId: firstMatch.matchId, point: { x: 0.5, y: 0.5 }, ...findingContext });
      const afterSecondGuess = await nextSnapshot;
      findingContext = actionContext(afterSecondGuess);
      const finished = waitForState(first, "FINISHED");
      first.emit("game:guess", { matchId: firstMatch.matchId, point: { x: 0.8, y: 0.8 }, ...findingContext });

      const result = await finished;
      expect(result).toMatchObject({ state: "FINISHED", winnerId: firstMatch.playerId });
      expect(result.players.find((player) => player.playerId === firstMatch.playerId)?.foundCount).toBe(3);
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(matchStore.matches.has(firstMatch.matchId)).toBe(true);

      const reportResult = once<{ reportId: string }>(first, "game:report-result");
      const finishedContext = actionContext(result);
      first.emit("game:report", { matchId: firstMatch.matchId, reason: "UNFAIR", ...actionContext(result) });
      await expect(reportResult).resolves.toMatchObject({ reportId: expect.any(String) });

      const duplicateError = once<GameErrorPayload>(first, "game:error");
      first.emit("game:report", { matchId: firstMatch.matchId, reason: "UNFAIR", ...finishedContext });
      await expect(duplicateError).resolves.toMatchObject({ code: "DUPLICATE_REPORT" });

      const metricsResponse = await app.inject({ method: "GET", url: "/metrics" });
      expect(metricsResponse.statusCode).toBe(200);
      expect(metricsResponse.json()).toMatchObject({
        matchesCreated: 1,
        matchesFinished: 1,
        matchesCancelled: 0,
        errors: {
          INVALID_INPUT: 1,
          STALE_STATE: 1,
          DUPLICATE_ACTION: 1,
        },
      });
      expect(JSON.stringify(metricsResponse.json())).not.toContain("guestToken");
    } finally {
      for (const socket of sockets.splice(0)) socket.disconnect();
      await app.close();
    }
  });

  it("restores the same player and match with a guest token", async () => {
    const app = await createGameServer({
      webOrigin: "http://localhost:5173",
      reconnectGraceMs: 200,
    });
    await app.listen({ host: "127.0.0.1", port: 0 });

    try {
      const port = (app.server.address() as AddressInfo).port;
      const url = `http://127.0.0.1:${port}`;
      const first = createClient(url) as TestSocket;
      const second = createClient(url) as TestSocket;
      sockets.push(first, second);
      const firstSessionPromise = once<SessionReadyPayload>(first, "session:ready");
      await Promise.all([once(first, "connect"), once(second, "connect")]);
      const firstSession = await firstSessionPromise;

      const firstFound = once<MatchFoundPayload>(first, "match:found");
      const secondFound = once<MatchFoundPayload>(second, "match:found");
      first.emit("queue:join", { nickname: "첫째" });
      second.emit("queue:join", { nickname: "둘째" });
      const [firstMatch, secondMatch] = await Promise.all([firstFound, secondFound]);

      const reconnecting = waitForConnection(second, firstSession.playerId, "RECONNECTING");
      first.disconnect();
      await reconnecting;

      const resumed = createClient(url, {
        autoConnect: false,
        auth: { guestToken: firstSession.guestToken },
      }) as TestSocket;
      sockets.push(resumed);
      const resumedSession = once<SessionReadyPayload>(resumed, "session:ready");
      const resumedMatch = once<MatchFoundPayload>(resumed, "match:found");
      const connectedAgain = waitForConnection(second, firstSession.playerId, "CONNECTED");
      resumed.connect();

      await expect(resumedSession).resolves.toMatchObject({ playerId: firstSession.playerId });
      await expect(resumedMatch).resolves.toMatchObject({ matchId: firstMatch.matchId });
      const resumedSnapshot = await connectedAgain;

      const finished = waitForState(second, "FINISHED");
      resumed.emit("game:forfeit", {
        matchId: firstMatch.matchId,
        actionId: crypto.randomUUID(),
        expectedState: resumedSnapshot.state,
        expectedStateVersion: resumedSnapshot.stateVersion,
      });
      await expect(finished).resolves.toMatchObject({
        winnerId: secondMatch.playerId,
        endReason: "FORFEIT",
      });
    } finally {
      for (const socket of sockets.splice(0)) socket.disconnect();
      await app.close();
    }
  });

  it("rate-limits consecutive interactive actions", async () => {
    const app = await createGameServer({
      webOrigin: "http://localhost:5173",
      inputCooldownMs: 1_000,
    });
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

      const editingFirst = waitForState(first, "EDITING");
      const editingSecond = waitForState(second, "EDITING");
      first.emit("game:ready", { matchId: firstMatch.matchId });
      second.emit("game:ready", { matchId: secondMatch.matchId });
      const [firstEditing, secondEditing] = await Promise.all([editingFirst, editingSecond]);

      const finding = waitForState(first, "FINDING");
      first.emit("game:submit", {
        matchId: firstMatch.matchId,
        differences,
        problemImageDataUrl,
        ...actionContext(firstEditing),
      });
      second.emit("game:submit", {
        matchId: secondMatch.matchId,
        differences,
        problemImageDataUrl,
        ...actionContext(secondEditing),
      });
      const findingSnapshot = await finding;

      const newer = waitForNewerVersion(first, findingSnapshot.stateVersion);
      first.emit("game:guess", {
        matchId: firstMatch.matchId,
        point: { x: 0.2, y: 0.2 },
        ...actionContext(findingSnapshot),
      });
      const afterGuess = await newer;
      const limited = once<GameErrorPayload>(first, "game:error");
      first.emit("game:hint", { matchId: firstMatch.matchId, ...actionContext(afterGuess) });
      await expect(limited).resolves.toMatchObject({ code: "INPUT_RATE_LIMITED" });
    } finally {
      for (const socket of sockets.splice(0)) socket.disconnect();
      await app.close();
    }
  });

  it("restores guest sessions and an active match after a server restart", async () => {
    const matchStore = new InMemoryMatchStore();
    const firstApp = await createGameServer({
      webOrigin: "http://localhost:5173",
      matchStore,
      reconnectGraceMs: 5_000,
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
      const [firstSession, secondSession] = await Promise.all([firstSessionPromise, secondSessionPromise]);

      const firstFound = once<MatchFoundPayload>(first, "match:found");
      const secondFound = once<MatchFoundPayload>(second, "match:found");
      first.emit("queue:join", { nickname: "첫째" });
      second.emit("queue:join", { nickname: "둘째" });
      const [firstMatch, secondMatch] = await Promise.all([firstFound, secondFound]);
      const editing = waitForState(first, "EDITING");
      first.emit("game:ready", { matchId: firstMatch.matchId });
      second.emit("game:ready", { matchId: secondMatch.matchId });
      await editing;
      await new Promise((resolve) => setTimeout(resolve, 0));

      first.disconnect();
      second.disconnect();
      await firstApp.close();

      secondApp = await createGameServer({
        webOrigin: "http://localhost:5173",
        matchStore,
        reconnectGraceMs: 5_000,
      });
      await secondApp.listen({ host: "127.0.0.1", port: 0 });
      const secondPort = (secondApp.server.address() as AddressInfo).port;
      const restoredFirst = createClient(`http://127.0.0.1:${secondPort}`, {
        auth: { guestToken: firstSession.guestToken },
      }) as TestSocket;
      const restoredSecond = createClient(`http://127.0.0.1:${secondPort}`, {
        auth: { guestToken: secondSession.guestToken },
      }) as TestSocket;
      sockets.push(restoredFirst, restoredSecond);
      const restoredFirstSession = once<SessionReadyPayload>(restoredFirst, "session:ready");
      const restoredFirstMatch = once<MatchFoundPayload>(restoredFirst, "match:found");
      const restoredEditing = waitForState(restoredFirst, "EDITING");
      await Promise.all([once(restoredFirst, "connect"), once(restoredSecond, "connect")]);

      await expect(restoredFirstSession).resolves.toMatchObject({ playerId: firstSession.playerId });
      await expect(restoredFirstMatch).resolves.toMatchObject({ matchId: firstMatch.matchId });
      await expect(restoredEditing).resolves.toMatchObject({ state: "EDITING" });
    } finally {
      for (const socket of sockets.splice(0)) socket.disconnect();
      if (secondApp) await secondApp.close();
      else await firstApp.close();
    }
  });

  it("forfeits a disconnected player after the grace period", async () => {
    const app = await createGameServer({
      webOrigin: "http://localhost:5173",
      reconnectGraceMs: 50,
    });
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

      const finished = waitForState(second, "FINISHED");
      first.disconnect();
      await expect(finished).resolves.toMatchObject({
        winnerId: secondMatch.playerId,
        endReason: "FORFEIT",
      });
      expect(firstMatch.playerId).not.toBe(secondMatch.playerId);
    } finally {
      for (const socket of sockets.splice(0)) socket.disconnect();
      await app.close();
    }
  });

  it("keeps the authoritative result when persistence fails", async () => {
    class FailingStore extends InMemoryMatchStore {
      override async saveMatch(): Promise<void> {
        throw new Error("database unavailable");
      }
    }
    const app = await createGameServer({
      webOrigin: "http://localhost:5173",
      matchStore: new FailingStore(),
    });
    await app.listen({ host: "127.0.0.1", port: 0 });

    try {
      const port = (app.server.address() as AddressInfo).port;
      const first = createClient(`http://127.0.0.1:${port}`) as TestSocket;
      const second = createClient(`http://127.0.0.1:${port}`) as TestSocket;
      sockets.push(first, second);
      await Promise.all([once(first, "connect"), once(second, "connect")]);

      const firstFound = once<MatchFoundPayload>(first, "match:found");
      const secondFound = once<MatchFoundPayload>(second, "match:found");
      const ready = waitForState(first, "READY");
      first.emit("queue:join", { nickname: "첫째" });
      second.emit("queue:join", { nickname: "둘째" });
      const [firstMatch, secondMatch] = await Promise.all([firstFound, secondFound]);
      const readySnapshot = await ready;

      const finished = waitForState(second, "FINISHED");
      first.emit("game:forfeit", {
        matchId: firstMatch.matchId,
        actionId: crypto.randomUUID(),
        expectedState: readySnapshot.state,
        expectedStateVersion: readySnapshot.stateVersion,
      });
      await expect(finished).resolves.toMatchObject({
        winnerId: secondMatch.playerId,
        endReason: "FORFEIT",
      });
    } finally {
      for (const socket of sockets.splice(0)) socket.disconnect();
      await app.close();
    }
  });
});
