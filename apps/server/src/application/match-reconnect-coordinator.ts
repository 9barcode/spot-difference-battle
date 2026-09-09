import type { GameMatch } from "@spot-battle/game-core";
import type { MatchRegistry } from "../game/match-registry.js";
import type { MatchStore } from "../persistence/match-store.js";
import type {
  GuestSession,
  GuestSessionRegistry,
} from "../sessions/guest-session-registry.js";
import type { MatchPersistenceCoordinator } from "./match-persistence-coordinator.js";

export interface ReconnectCoordinatorLogger {
  error(event: string, error: unknown, context?: Record<string, unknown>): void;
  warning(event: string, context?: Record<string, unknown>): void;
}

export interface MatchReconnectCoordinatorOptions {
  store: MatchStore;
  registry: MatchRegistry;
  sessions: GuestSessionRegistry;
  persistence: MatchPersistenceCoordinator;
  reconnectGraceMs: number;
  emitSnapshots(match: GameMatch): void;
  logger: ReconnectCoordinatorLogger;
}

/** Owns reconnect deadlines and restoration of persisted runtime state. */
export class MatchReconnectCoordinator {
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();
  private closing = false;

  constructor(private readonly options: MatchReconnectCoordinatorOptions) {}

  async restore(): Promise<void> {
    try {
      const restoredGuests = await this.options.store.loadGuests();
      for (const guest of restoredGuests) this.options.sessions.restore(guest);

      const restoredMatches = await this.options.store.loadActiveMatches();
      for (const state of restoredMatches) {
        try {
          const match = this.options.registry.restore(state);
          if (match.expire(Date.now())) {
            await this.options.persistence.persistIfFinished(match);
            continue;
          }
          const missingSession = state.players.some(
            (player) => !this.options.sessions.getByPlayer(player.playerId),
          );
          if (missingSession) {
            match.cancel("복구할 수 없는 참가자 세션이 있어 경기를 취소했습니다.");
            await this.options.persistence.persistIfFinished(match);
            continue;
          }
          for (const player of state.players) {
            match.setConnectionStatus(player.playerId, "RECONNECTING");
            this.schedule(this.options.sessions.getByPlayer(player.playerId)!);
          }
          await this.options.persistence.persistRuntime(match);
        } catch (error) {
          this.options.logger.error("match.restore_failed", error, {
            matchId: typeof state.matchId === "string" ? state.matchId : undefined,
          });
          if (typeof state.matchId === "string") {
            await this.options.store.deleteActiveMatch(state.matchId);
          }
        }
      }
    } catch (error) {
      this.options.logger.error("match.restore_load_failed", error);
    }
  }

  connected(session: GuestSession): void {
    const timer = this.timers.get(session.playerId);
    if (timer) clearTimeout(timer);
    this.timers.delete(session.playerId);
  }

  schedule(session: GuestSession): void {
    if (this.closing) return;
    this.connected(session);
    const timer = setTimeout(() => {
      this.timers.delete(session.playerId);
      if (session.socketId) return;
      const match = this.options.registry.getCurrentForPlayer(session.playerId);
      if (!match) return;
      this.options.logger.warning("match.reconnect_timeout", {
        matchId: match.matchId,
        playerId: session.playerId,
        state: match.currentState,
      });
      match.forfeit(session.playerId);
      this.options.emitSnapshots(match);
      void this.options.persistence.persistIfFinished(match);
    }, this.options.reconnectGraceMs);
    timer.unref();
    this.timers.set(session.playerId, timer);
  }

  hasPending(playerId: string): boolean {
    return this.timers.has(playerId);
  }

  close(): void {
    this.closing = true;
    for (const timer of this.timers.values()) clearTimeout(timer);
    this.timers.clear();
  }
}
