import { randomUUID } from "node:crypto";

export interface GuestSession {
  guestToken: string;
  playerId: string;
  nickname: string | null;
  socketId: string | null;
  lastSeenAt: number;
}

export interface StoredGuestSession {
  guestToken: string;
  playerId: string;
  nickname: string | null;
  updatedAt: number;
}

export class GuestSessionRegistry {
  private readonly sessionsByToken = new Map<string, GuestSession>();
  private readonly sessionsByPlayer = new Map<string, GuestSession>();

  constructor(private readonly retentionMs: number) {}

  create(now = Date.now()): GuestSession {
    const session: GuestSession = {
      guestToken: randomUUID(),
      playerId: randomUUID(),
      nickname: null,
      socketId: null,
      lastSeenAt: now,
    };
    this.add(session);
    return session;
  }

  restore(stored: StoredGuestSession): GuestSession {
    const session: GuestSession = {
      guestToken: stored.guestToken,
      playerId: stored.playerId,
      nickname: stored.nickname,
      socketId: null,
      lastSeenAt: stored.updatedAt,
    };
    this.add(session);
    return session;
  }

  getByToken(guestToken: string): GuestSession | undefined {
    return this.sessionsByToken.get(guestToken);
  }

  getByPlayer(playerId: string): GuestSession | undefined {
    return this.sessionsByPlayer.get(playerId);
  }

  touch(session: GuestSession, now = Date.now()): void {
    session.lastSeenAt = now;
  }

  removeExpired(
    now: number,
    isProtected: (playerId: string) => boolean,
  ): GuestSession[] {
    const removed: GuestSession[] = [];
    for (const session of this.sessionsByPlayer.values()) {
      if (
        session.socketId ||
        now - session.lastSeenAt < this.retentionMs ||
        isProtected(session.playerId)
      ) {
        continue;
      }
      this.sessionsByPlayer.delete(session.playerId);
      if (this.sessionsByToken.get(session.guestToken) === session) {
        this.sessionsByToken.delete(session.guestToken);
      }
      removed.push(session);
    }
    return removed;
  }

  private add(session: GuestSession): void {
    this.sessionsByToken.set(session.guestToken, session);
    this.sessionsByPlayer.set(session.playerId, session);
  }
}
