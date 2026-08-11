import { describe, expect, it } from "vitest";
import { GuestSessionRegistry } from "./guest-session-registry.js";

describe("GuestSessionRegistry", () => {
  it("보존 시간이 지난 연결 해제 세션만 제거한다", () => {
    const registry = new GuestSessionRegistry(1_000);
    const expired = registry.create(0);
    const connected = registry.create(0);
    const recent = registry.create(750);
    connected.socketId = "socket-1";

    expect(registry.removeExpired(1_500, () => false)).toEqual([expired]);
    expect(registry.getByToken(expired.guestToken)).toBeUndefined();
    expect(registry.getByPlayer(expired.playerId)).toBeUndefined();
    expect(registry.getByPlayer(connected.playerId)).toBe(connected);
    expect(registry.getByPlayer(recent.playerId)).toBe(recent);
  });

  it("대기열이나 경기에 속한 세션은 보호한다", () => {
    const registry = new GuestSessionRegistry(1_000);
    const session = registry.create(0);

    expect(registry.removeExpired(2_000, (id) => id === session.playerId)).toEqual([]);
    expect(registry.getByPlayer(session.playerId)).toBe(session);
  });

  it("저장된 마지막 활동 시각을 복원하고 활동 시 갱신한다", () => {
    const registry = new GuestSessionRegistry(1_000);
    const session = registry.restore({
      guestToken: "token",
      playerId: "player",
      nickname: "플레이어",
      updatedAt: 500,
    });
    registry.touch(session, 1_500);

    expect(registry.removeExpired(2_000, () => false)).toEqual([]);
    expect(registry.removeExpired(2_500, () => false)).toEqual([session]);
  });
});
