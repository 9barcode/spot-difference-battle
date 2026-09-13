import { GameMatch } from "@spot-battle/game-core";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { describe, expect, it } from "vitest";
import { GAME_PUZZLES } from "../../src/game/puzzle-catalog.js";
import { SupabasePostgresMatchStore } from "../../src/persistence/match-store.js";

const databaseUrl = process.env.SUPABASE_DB_URL;
const describeDatabase = databaseUrl ? describe : describe.skip;

describeDatabase("PostgreSQL restart recovery", () => {
  it("restores schema-v2 identity, puzzle order, deadline, and progress through a new store instance", async () => {
    const matchId = randomUUID();
    const firstId = randomUUID();
    const secondId = randomUUID();
    const firstToken = randomUUID();
    const secondToken = randomUUID();
    const pool = new Pool({ connectionString: databaseUrl });
    let firstStore: SupabasePostgresMatchStore | null = new SupabasePostgresMatchStore(databaseUrl!);
    let secondStore: SupabasePostgresMatchStore | null = null;

    try {
      await firstStore.upsertGuest({ playerId: firstId, guestToken: firstToken, nickname: "재시작첫째" });
      await firstStore.upsertGuest({ playerId: secondId, guestToken: secondToken, nickname: "재시작둘째" });
      const match = new GameMatch(matchId, GAME_PUZZLES, [
        { playerId: firstId, nickname: "재시작첫째" },
        { playerId: secondId, nickname: "재시작둘째" },
      ], 1_000);
      match.markReady(firstId, 1_100);
      match.markReady(secondId, 1_100);
      match.markLoaded(firstId, GAME_PUZZLES[0]!.id, GAME_PUZZLES[0]!.assetVersion, 1_200);
      match.markLoaded(secondId, GAME_PUZZLES[0]!.id, GAME_PUZZLES[0]!.assetVersion, 1_200);
      match.expire(4_200);
      match.guess(firstId, GAME_PUZZLES[0]!.id, GAME_PUZZLES[0]!.differences[0]!.regions[0]!, 4_300);
      const before = match.serialize();
      await firstStore.saveActiveMatch(before);
      await firstStore.close();
      firstStore = null;

      secondStore = new SupabasePostgresMatchStore(databaseUrl!);
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
  it("stores the exact puzzle manifest and private player totals for audit", async () => {
    const matchId = randomUUID();
    const firstId = randomUUID();
    const secondId = randomUUID();
    const store = new SupabasePostgresMatchStore(databaseUrl!);
    const pool = new Pool({ connectionString: databaseUrl });

    try {
      const match = new GameMatch(matchId, [GAME_PUZZLES[0]!], [
        { playerId: firstId, nickname: "감사첫째" },
        { playerId: secondId, nickname: "감사둘째" },
      ], 1_000);
      match.markReady(firstId, 1_100);
      match.markReady(secondId, 1_100);
      match.markLoaded(firstId, GAME_PUZZLES[0]!.id, GAME_PUZZLES[0]!.assetVersion, 1_200);
      match.markLoaded(secondId, GAME_PUZZLES[0]!.id, GAME_PUZZLES[0]!.assetVersion, 1_200);
      match.expire(4_200);
      match.guess(firstId, GAME_PUZZLES[0]!.id, GAME_PUZZLES[0]!.differences[0]!.regions[0]!, 4_300);
      match.guess(secondId, GAME_PUZZLES[0]!.id, { x: 0.95, y: 0.95 }, 4_300);
      match.forfeit(secondId);
      const state = match.serialize();

      await store.saveMatch(match.snapshot(firstId), state);

      const savedMatch = await pool.query<{
        puzzle_manifest: typeof state.puzzles;
        mode: string;
        difficulty: string;
        total_puzzle_count: number;
        total_difference_count: number;
        final_state: typeof state;
      }>(
        `SELECT puzzle_manifest, mode, difficulty, total_puzzle_count,
                total_difference_count, final_state
         FROM matches WHERE id = $1`,
        [matchId],
      );
      expect(savedMatch.rows[0]?.puzzle_manifest).toEqual(state.puzzles);
      expect(savedMatch.rows[0]).toMatchObject({
        mode: "STANDARD",
        difficulty: "NORMAL",
        total_puzzle_count: 1,
        total_difference_count: GAME_PUZZLES[0]!.differences.length,
        final_state: state,
      });
      const savedPlayers = await pool.query<{
        player_id: string;
        found_count: number;
        wrong_answer_count: number;
        result: string;
        total_found_count: number;
        found_ids_by_puzzle: string[][];
      }>(
        `SELECT player_id, found_count, wrong_answer_count, result,
                total_found_count, found_ids_by_puzzle
         FROM match_players WHERE match_id = $1 ORDER BY player_id`,
        [matchId],
      );
      expect(savedPlayers.rows).toEqual(expect.arrayContaining([
        expect.objectContaining({
          player_id: firstId,
          found_count: 1,
          wrong_answer_count: 0,
          result: "WIN",
          total_found_count: 1,
        }),
        expect.objectContaining({
          player_id: secondId,
          found_count: 0,
          wrong_answer_count: 1,
          result: "LOSE",
          total_found_count: 0,
        }),
      ]));
    } finally {
      await store.close();
      await pool.query("DELETE FROM matches WHERE id = $1", [matchId]);
      await pool.end();
    }
  });
});
