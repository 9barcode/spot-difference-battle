import { describe, expect, it } from "vitest";
import { MatchPersistenceCoordinator } from "../../src/application/match-persistence-coordinator.js";
import { MatchReconnectCoordinator } from "../../src/application/match-reconnect-coordinator.js";
import { MatchRegistry } from "../../src/game/match-registry.js";
import { InMemoryMatchStore } from "../../src/persistence/match-store.js";
import { GuestSessionRegistry } from "../../src/sessions/guest-session-registry.js";

const silentLogger = { error: () => undefined, warning: () => undefined };

function createRuntime(reconnectGraceMs: number) {
  const store = new InMemoryMatchStore();
  const registry = new MatchRegistry();
  const sessions = new GuestSessionRegistry(60_000);
  const persistence = new MatchPersistenceCoordinator({
    store,
    registry,
    finishedMatchRetentionMs: 60_000,
    logger: silentLogger,
  });
  const snapshots: string[] = [];
  const reconnect = new MatchReconnectCoordinator({
    store,
    registry,
    sessions,
    persistence,
    reconnectGraceMs,
    emitSnapshots: (match) => snapshots.push(match.currentState),
    logger: silentLogger,
  });
  return { store, registry, sessions, persistence, reconnect, snapshots };
}

describe("MatchReconnectCoordinator", () => {
  it("유예 시간 안에 재연결하지 않으면 서버 경기 결과로 몰수패 처리한다", async () => {
    const runtime = createRuntime(10);
    const first = runtime.sessions.create();
    const second = runtime.sessions.create();
    const match = runtime.registry.create("match-1", [
      { playerId: first.playerId, nickname: "첫째" },
      { playerId: second.playerId, nickname: "둘째" },
    ]);

    runtime.reconnect.schedule(first);
    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(match.currentState).toBe("FINISHED");
    expect(match.snapshot().winnerId).toBe(second.playerId);
    expect(runtime.snapshots).toContain("FINISHED");
    await runtime.persistence.close();
  });

  it("재연결하면 예약된 몰수패를 취소한다", async () => {
    const runtime = createRuntime(10);
    const first = runtime.sessions.create();
    const second = runtime.sessions.create();
    const match = runtime.registry.create("match-1", [
      { playerId: first.playerId, nickname: "첫째" },
      { playerId: second.playerId, nickname: "둘째" },
    ]);

    runtime.reconnect.schedule(first);
    runtime.reconnect.connected(first);
    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(match.currentState).not.toBe("FINISHED");
    expect(runtime.reconnect.hasPending(first.playerId)).toBe(false);
    runtime.reconnect.close();
    await runtime.persistence.close();
  });
});
