import type { GameSnapshot } from "@spot-battle/shared";
import { describe, expect, it } from "vitest";
import { InMemoryMatchStore } from "../src/match-store.js";

const snapshot: GameSnapshot = {
  matchId: "11111111-1111-4111-8111-111111111111",
  state: "FINISHED",
  stateVersion: 10,
  imageId: "image-1",
  deadlineMs: null,
  players: [
    {
      playerId: "22222222-2222-4222-8222-222222222222",
      nickname: "첫째",
      ready: true,
      submitted: true,
      foundCount: 3,
      wrongAnswerCount: 0,
      hintsRemaining: 1,
      connectionStatus: "CONNECTED",
    },
    {
      playerId: "33333333-3333-4333-8333-333333333333",
      nickname: "둘째",
      ready: true,
      submitted: true,
      foundCount: 2,
      wrongAnswerCount: 1,
      hintsRemaining: 0,
      connectionStatus: "CONNECTED",
    },
  ],
  winnerId: "22222222-2222-4222-8222-222222222222",
  problemImageDataUrl: null,
  myFoundIds: [],
  endReason: "COMPLETED",
  cancelReason: null,
};

describe("InMemoryMatchStore", () => {
  it("stores a completed match only once", async () => {
    const store = new InMemoryMatchStore();
    await store.saveMatch(snapshot);
    await store.saveMatch({ ...snapshot, stateVersion: 99 });

    expect(store.matches.size).toBe(1);
    expect(store.matches.get(snapshot.matchId)?.stateVersion).toBe(10);
  });

  it("rejects duplicate reports from the same player and match", async () => {
    const store = new InMemoryMatchStore();
    const report = {
      matchId: snapshot.matchId,
      reporterPlayerId: snapshot.players[0].playerId,
      reason: "UNFAIR" as const,
    };

    await expect(store.createReport(report)).resolves.toBeTypeOf("string");
    await expect(store.createReport(report)).rejects.toThrow("DUPLICATE_REPORT");
  });
});
