import type { GameMatch } from "@spot-battle/game-core";
import type { MatchRegistry } from "../game/match-registry.js";
import type { MatchStore } from "../persistence/match-store.js";
import type { GuestSession } from "../sessions/guest-session-registry.js";

export interface PersistenceCoordinatorLogger {
  error(event: string, error: unknown, context?: Record<string, unknown>): void;
}

export interface MatchPersistenceCoordinatorOptions {
  store: MatchStore;
  registry: MatchRegistry;
  finishedMatchRetentionMs: number;
  logger: PersistenceCoordinatorLogger;
}

/**
 * Serializes state writes and owns persistence-related lifecycle cleanup.
 * Transport code asks for persistence but never manages write ordering itself.
 */
export class MatchPersistenceCoordinator {
  private readonly store: MatchStore;
  private readonly registry: MatchRegistry;
  private readonly finishedMatchRetentionMs: number;
  private readonly logger: PersistenceCoordinatorLogger;
  private readonly persistedMatches = new Set<string>();
  private readonly runtimeWrites = new Map<string, Promise<void>>();
  private readonly guestWrites = new Set<Promise<void>>();
  private readonly cleanupTimers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(options: MatchPersistenceCoordinatorOptions) {
    this.store = options.store;
    this.registry = options.registry;
    this.finishedMatchRetentionMs = options.finishedMatchRetentionMs;
    this.logger = options.logger;
  }

  persistGuest(session: GuestSession): void {
    this.trackGuestWrite(this.store.upsertGuest(session));
  }

  deleteGuest(session: GuestSession): void {
    this.trackGuestWrite(this.store.deleteGuest(session.playerId));
  }

  private trackGuestWrite(write: Promise<void>): void {
    const handled = write.catch((error) =>
      this.logger.error("database.guest_write_failed", error),
    );
    this.guestWrites.add(handled);
    void handled.finally(() => this.guestWrites.delete(handled));
  }

  persistRuntime(match: GameMatch): Promise<void> {
    const matchId = match.matchId;
    const state = match.currentState === "FINISHED" || match.currentState === "CANCELLED"
      ? null
      : match.serialize();
    const previous = this.runtimeWrites.get(matchId) ?? Promise.resolve();
    const next = previous
      .catch((error) => this.logger.error("database.active_match_write_failed", error, { matchId }))
      .then(async () => {
        if (state) await this.store.saveActiveMatch(state);
        else await this.store.deleteActiveMatch(matchId);
      });
    this.runtimeWrites.set(matchId, next);
    const clearWrite = () => {
      if (this.runtimeWrites.get(matchId) === next) this.runtimeWrites.delete(matchId);
    };
    void next.then(clearWrite, clearWrite);
    return next;
  }

  async persistIfFinished(match: GameMatch): Promise<boolean> {
    if (
      this.persistedMatches.has(match.matchId) ||
      (match.currentState !== "FINISHED" && match.currentState !== "CANCELLED")
    ) {
      return true;
    }
    try {
      await this.store.saveMatch(match.snapshot(), match.serialize());
      await this.persistRuntime(match);
      this.persistedMatches.add(match.matchId);
      this.scheduleCleanup(match.matchId);
      return true;
    } catch (error) {
      this.logger.error("database.finished_match_save_failed", error, {
        matchId: match.matchId,
        state: match.currentState,
      });
      return false;
    }
  }

  private scheduleCleanup(matchId: string): void {
    if (this.cleanupTimers.has(matchId)) return;
    const timer = setTimeout(() => {
      this.cleanupTimers.delete(matchId);
      this.registry.remove(matchId);
      this.persistedMatches.delete(matchId);
    }, this.finishedMatchRetentionMs);
    timer.unref();
    this.cleanupTimers.set(matchId, timer);
  }

  async close(): Promise<void> {
    for (const timer of this.cleanupTimers.values()) clearTimeout(timer);
    this.cleanupTimers.clear();
    await Promise.allSettled([...this.runtimeWrites.values(), ...this.guestWrites]);
    await this.store.close();
  }
}
