import type { GameSnapshot } from "@spot-battle/shared";
import { GameMatch } from "@spot-battle/game-core";
import { describe, expect, it } from "vitest";
import { GAME_PUZZLES } from "../src/game-puzzles.js";
import { InMemoryMatchStore } from "../src/match-store.js";

const snapshot: GameSnapshot = {
  matchId: "11111111-1111-4111-8111-111111111111",
  state: "FINISHED",
  stateVersion: 10,
  imageId: "enchanted-forest",
  currentPuzzleId: null,
  nextPuzzleId: null,
  totalPuzzleCount: 2,
  deadlineMs: null,
  players: [
    { playerId: "22222222-2222-4222-8222-222222222222", nickname: "첫째", ready: true, loaded: true, puzzleIndex: 2, completedPuzzleCount: 2, foundCount: 0, totalFoundCount: 6, wrongAnswerCount: 0, inputLockedUntilMs: null, connectionStatus: "CONNECTED" },
    { playerId: "33333333-3333-4333-8333-333333333333", nickname: "둘째", ready: true, loaded: true, puzzleIndex: 1, completedPuzzleCount: 1, foundCount: 2, totalFoundCount: 5, wrongAnswerCount: 1, inputLockedUntilMs: null, connectionStatus: "CONNECTED" },
  ],
  winnerId: "22222222-2222-4222-8222-222222222222",
  problemImage: null,
  myFoundIds: [],
  foundMarks: [],
  revealedDifferences: null,
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

  it("rejects duplicate reports", async () => {
    const store = new InMemoryMatchStore();
    const report = { matchId: snapshot.matchId, reporterPlayerId: snapshot.players[0].playerId, reason: "UNFAIR" as const };
    await expect(store.createReport(report)).resolves.toBeTypeOf("string");
    await expect(store.createReport(report)).rejects.toThrow("DUPLICATE_REPORT");
  });

  it("clones active state and removes it", async () => {
    const store = new InMemoryMatchStore();
    const match = new GameMatch(snapshot.matchId, GAME_PUZZLES, [
      { playerId: snapshot.players[0].playerId, nickname: "첫째" },
      { playerId: snapshot.players[1].playerId, nickname: "둘째" },
    ]);
    const state = match.serialize();
    await store.saveActiveMatch(state);
    state.players[0].nickname = "변경됨";
    await expect(store.loadActiveMatches()).resolves.toMatchObject([{ matchId: snapshot.matchId, players: [{ nickname: "첫째" }, { nickname: "둘째" }] }]);
    await store.deleteActiveMatch(snapshot.matchId);
    await expect(store.loadActiveMatches()).resolves.toEqual([]);
  });
});
