import { describe, expect, it } from "vitest";
import { MatchPersistenceCoordinator } from "../../src/application/match-persistence-coordinator.js";
import { MatchRegistry } from "../../src/game/match-registry.js";
import { InMemoryMatchStore } from "../../src/persistence/match-store.js";

const silentLogger = { error: () => undefined };

describe("MatchPersistenceCoordinator", () => {
  it("활성 상태와 종료 결과를 실제 저장소 구현에 순서대로 기록한다", async () => {
    const store = new InMemoryMatchStore();
    const registry = new MatchRegistry();
    const coordinator = new MatchPersistenceCoordinator({
      store,
      registry,
      finishedMatchRetentionMs: 10_000,
      logger: silentLogger,
    });
    const match = registry.create("match-1", [
      { playerId: "player-1", nickname: "첫째" },
      { playerId: "player-2", nickname: "둘째" },
    ]);

    await coordinator.persistRuntime(match);
    expect(store.activeMatches.has(match.matchId)).toBe(true);

    match.cancel("테스트 종료");
    expect(await coordinator.persistIfFinished(match)).toBe(true);
    expect(store.matches.has(match.matchId)).toBe(true);
    expect(store.activeMatches.has(match.matchId)).toBe(false);
    await coordinator.close();
  });

  it("게스트 저장과 삭제 작업을 종료 전에 모두 반영한다", async () => {
    const store = new InMemoryMatchStore();
    const coordinator = new MatchPersistenceCoordinator({
      store,
      registry: new MatchRegistry(),
      finishedMatchRetentionMs: 10_000,
      logger: silentLogger,
    });
    const session = {
      playerId: "player-1",
      guestToken: "token-1",
      nickname: "첫째",
      socketId: null,
      lastSeenAt: Date.now(),
    };

    coordinator.persistGuest(session);
    await new Promise((resolve) => setImmediate(resolve));
    expect(store.guests.has(session.playerId)).toBe(true);
    coordinator.deleteGuest(session);
    await coordinator.close();
    expect(store.guests.has(session.playerId)).toBe(false);
  });
});
