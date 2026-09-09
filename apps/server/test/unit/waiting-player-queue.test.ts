import { describe, expect, it } from "vitest";
import { WaitingPlayerQueue } from "../../src/application/waiting-player-queue.js";

describe("WaitingPlayerQueue", () => {
  it("같은 모드와 난이도의 상대만 반환한다", () => {
    const queue = new WaitingPlayerQueue();
    queue.set({
      playerId: "player-1", socketId: "socket-1", nickname: "첫째",
      settings: { mode: "STANDARD", difficulty: "NORMAL" },
    });
    expect(queue.get({ mode: "STANDARD", difficulty: "NORMAL" })?.playerId).toBe("player-1");
    expect(queue.get({ mode: "STANDARD", difficulty: "HARD" })).toBeUndefined();
  });

  it("플레이어를 다른 대기열에 중복 등록하지 않는다", () => {
    const queue = new WaitingPlayerQueue();
    queue.set({ playerId: "player-1", socketId: "old", nickname: "첫째", settings: { mode: "STANDARD", difficulty: "NORMAL" } });
    queue.set({ playerId: "player-1", socketId: "new", nickname: "첫째", settings: { mode: "STANDARD", difficulty: "HARD" } });
    expect(queue.get({ mode: "STANDARD", difficulty: "NORMAL" })).toBeUndefined();
    expect(queue.get({ mode: "STANDARD", difficulty: "HARD" })?.socketId).toBe("new");
  });
});
