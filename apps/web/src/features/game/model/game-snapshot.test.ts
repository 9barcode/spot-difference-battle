import { afterEach, describe, expect, it, vi } from "vitest";
import { shouldAcceptGameSnapshot } from "./game-snapshot.js";

afterEach(() => {
  vi.useRealTimers();
});

describe("shouldAcceptGameSnapshot", () => {
  it("accepts the first snapshot and a newer version", () => {
    expect(shouldAcceptGameSnapshot(null, { matchId: "match-a", stateVersion: 1 })).toBe(true);
    expect(
      shouldAcceptGameSnapshot(
        { matchId: "match-a", stateVersion: 1 },
        { matchId: "match-a", stateVersion: 2 },
      ),
    ).toBe(true);
  });

  it("ignores duplicate and delayed snapshots from the same match", () => {
    expect(
      shouldAcceptGameSnapshot(
        { matchId: "match-a", stateVersion: 3 },
        { matchId: "match-a", stateVersion: 3 },
      ),
    ).toBe(false);
    expect(
      shouldAcceptGameSnapshot(
        { matchId: "match-a", stateVersion: 3 },
        { matchId: "match-a", stateVersion: 2 },
      ),
    ).toBe(false);
  });

  it("accepts a snapshot from a new match even when its version is lower", () => {
    expect(
      shouldAcceptGameSnapshot(
        { matchId: "match-a", stateVersion: 8 },
        { matchId: "match-b", stateVersion: 1 },
      ),
    ).toBe(true);
  });

  it("keeps the newest snapshot when network delay reverses delivery order", async () => {
    vi.useFakeTimers();
    let current = { matchId: "match-a", stateVersion: 1 };
    const deliver = (incoming: typeof current, delayMs: number) => {
      setTimeout(() => {
        if (shouldAcceptGameSnapshot(current, incoming)) current = incoming;
      }, delayMs);
    };

    deliver({ matchId: "match-a", stateVersion: 2 }, 100);
    deliver({ matchId: "match-a", stateVersion: 3 }, 10);

    await vi.advanceTimersByTimeAsync(100);
    expect(current.stateVersion).toBe(3);
  });
});
