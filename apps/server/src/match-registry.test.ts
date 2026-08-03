import { describe, expect, it } from "vitest";
import { MatchRegistry } from "./match-registry.js";

const players = [
  { playerId: "player-1", nickname: "첫째" },
  { playerId: "player-2", nickname: "둘째" },
] as const;

describe("MatchRegistry 메모리 정리", () => {
  it("종료된 경기 객체와 해당 플레이어 연결을 함께 제거한다", () => {
    const registry = new MatchRegistry();
    registry.create("old-match", [...players]);

    expect(registry.remove("old-match")).toBe(true);
    expect(registry.getCurrentForPlayer("player-1")).toBeNull();
    expect(registry.getCurrentForPlayer("player-2")).toBeNull();
    expect(registry.remove("old-match")).toBe(false);
  });

  it("같은 플레이어가 새 경기에 들어간 뒤에는 새 연결을 지우지 않는다", () => {
    const registry = new MatchRegistry();
    registry.create("old-match", [...players]);
    const newMatch = registry.create("new-match", [...players]);

    registry.remove("old-match");

    expect(registry.getCurrentForPlayer("player-1")).toBe(newMatch);
    expect(registry.getCurrentForPlayer("player-2")).toBe(newMatch);
  });
});
