import type { GameSnapshot, ReportReason } from "@spot-battle/shared";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";

export interface ReportInput {
  matchId: string;
  reporterPlayerId: string;
  reason: ReportReason;
  details?: string;
}

export interface MatchStore {
  health(): Promise<boolean>;
  upsertGuest(input: { playerId: string; guestToken: string; nickname: string | null }): Promise<void>;
  saveMatch(snapshot: GameSnapshot): Promise<void>;
  createReport(input: ReportInput): Promise<string>;
  close(): Promise<void>;
}

export class InMemoryMatchStore implements MatchStore {
  readonly matches = new Map<string, GameSnapshot>();
  readonly reports = new Map<string, ReportInput>();
  readonly guests = new Map<string, { guestToken: string; nickname: string | null }>();

  async health(): Promise<boolean> {
    return true;
  }

  async upsertGuest(input: {
    playerId: string;
    guestToken: string;
    nickname: string | null;
  }): Promise<void> {
    this.guests.set(input.playerId, {
      guestToken: input.guestToken,
      nickname: input.nickname,
    });
  }

  async saveMatch(snapshot: GameSnapshot): Promise<void> {
    if (!this.matches.has(snapshot.matchId)) this.matches.set(snapshot.matchId, structuredClone(snapshot));
  }

  async createReport(input: ReportInput): Promise<string> {
    const duplicate = [...this.reports.values()].some(
      (report) =>
        report.matchId === input.matchId &&
        report.reporterPlayerId === input.reporterPlayerId,
    );
    if (duplicate) throw new Error("DUPLICATE_REPORT");
    const reportId = randomUUID();
    this.reports.set(reportId, structuredClone(input));
    return reportId;
  }

  async close(): Promise<void> {}
}

export class PostgresMatchStore implements MatchStore {
  private readonly pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString });
  }

  async health(): Promise<boolean> {
    try {
      await this.pool.query("SELECT 1");
      return true;
    } catch {
      return false;
    }
  }

  async upsertGuest(input: {
    playerId: string;
    guestToken: string;
    nickname: string | null;
  }): Promise<void> {
    await this.pool.query(
      `INSERT INTO guest_sessions (player_id, guest_token, nickname)
       VALUES ($1, $2, $3)
       ON CONFLICT (player_id) DO UPDATE
       SET guest_token = EXCLUDED.guest_token,
           nickname = COALESCE(EXCLUDED.nickname, guest_sessions.nickname),
           updated_at = NOW()`,
      [input.playerId, input.guestToken, input.nickname],
    );
  }

  async saveMatch(snapshot: GameSnapshot): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const inserted = await client.query(
        `INSERT INTO matches (id, image_id, winner_player_id, end_reason, state_version, ended_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (id) DO NOTHING
         RETURNING id`,
        [
          snapshot.matchId,
          snapshot.imageId,
          snapshot.winnerId,
          snapshot.endReason,
          snapshot.stateVersion,
        ],
      );
      if (inserted.rowCount) {
        for (const player of snapshot.players) {
          await client.query(
            `INSERT INTO match_players
             (match_id, player_id, nickname, found_count, wrong_answer_count, hints_used, connection_status)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              snapshot.matchId,
              player.playerId,
              player.nickname,
              player.foundCount,
              player.wrongAnswerCount,
              1 - player.hintsRemaining,
              player.connectionStatus,
            ],
          );
        }
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async createReport(input: ReportInput): Promise<string> {
    const reportId = randomUUID();
    try {
      await this.pool.query(
        `INSERT INTO reports (id, match_id, reporter_player_id, reason, details)
         VALUES ($1, $2, $3, $4, $5)`,
        [reportId, input.matchId, input.reporterPlayerId, input.reason, input.details ?? null],
      );
      return reportId;
    } catch (error) {
      if ((error as { code?: string }).code === "23505") throw new Error("DUPLICATE_REPORT");
      throw error;
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
