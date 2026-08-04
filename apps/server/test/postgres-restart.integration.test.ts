import { GameMatch } from "@spot-battle/game-core";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { describe, expect, it } from "vitest";
import { GAME_PUZZLES } from "../src/game-puzzles.js";
import { PostgresMatchStore } from "../src/match-store.js";

const databaseUrl = process.env.DATABASE_URL;
const describeDatabase = databaseUrl ? describe : describe.skip;

describeDatabase("PostgreSQL restart recovery", () => {
  it("restores schema-v2 identity, puzzle order, deadline, and progress through a new store instance", async () => {
    const matchId = randomUUID();
    const firstId = randomUUID();
    const secondId = randomUUID();
    const firstToken = randomUUID();
    const secondToken = randomUUID();
    const pool = new Pool({ connectionString: databaseUrl });
    let firstStore: PostgresMatchStore | null = new PostgresMatchStore(databaseUrl!);
    let secondStore: PostgresMatchStore | null = null;

    try {
      await firstStore.upsertGuest({ playerId: firstId, guestToken: firstToken, nickname: "재시작첫째" });
      await firstStore.upsertGuest({ playerId: secondId, guestToken: secondToken, nickname: "재시작둘째" });
      const match = new GameMatch(matchId, GAME_PUZZLES, [
        { playerId: firstId, nickname: "재시작첫째" },
        { playerId: secondId, nickname: "재시작둘째" },
      ], 1_000);
      match.markReady(firstId, 1_100);
      match.markReady(secondId, 1_100);
      match.markLoaded(firstId, GAME_PUZZLES[0]!.id, 1_200);
      match.markLoaded(secondId, GAME_PUZZLES[0]!.id, 1_200);
      match.expire(4_200);
      match.guess(firstId, GAME_PUZZLES[0]!.id, GAME_PUZZLES[0]!.differences[0]!.regions[0]!, 4_300);
      const before = match.serialize();
      await firstStore.saveActiveMatch(before);
      await firstStore.close();
      firstStore = null;

      secondStore = new PostgresMatchStore(databaseUrl!);
      const states = await secondStore.loadActiveMatches();
      const persisted = states.find((state) => state.matchId === matchId);
      expect(persisted).toBeDefined();
      const restored = GameMatch.restore(persisted!);
      expect(restored.serialize()).toMatchObject({
        schemaVersion: 2,
        matchId,
        state: "PLAYING",
        deadlineMs: before.deadlineMs,
        puzzles: before.puzzles,
      });
      expect(restored.snapshot(firstId)).toMatchObject({ myFoundIds: [GAME_PUZZLES[0]!.differences[0]!.id] });
      await expect(secondStore.loadGuests()).resolves.toEqual(expect.arrayContaining([
        expect.objectContaining({ playerId: firstId, guestToken: firstToken }),
        expect.objectContaining({ playerId: secondId, guestToken: secondToken }),
      ]));
    } finally {
      if (firstStore) await firstStore.close();
      if (secondStore) await secondStore.close();
      await pool.query("DELETE FROM active_matches WHERE match_id = $1", [matchId]);
      await pool.query("DELETE FROM guest_sessions WHERE player_id = ANY($1::uuid[])", [[firstId, secondId]]);
      await pool.end();
    }
  });
});