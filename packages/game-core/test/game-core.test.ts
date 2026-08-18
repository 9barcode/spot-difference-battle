import { describe, expect, it } from "vitest";
import type { PlayerResult } from "@spot-battle/shared";
import {
  determineWinner,
  getRemainingTimeMs,
  isPointInAnswerRegion,
} from "../src/index.js";

describe("answer and time rules", () => {
  it("uses a circular answer region", () => {
    const region = { x: 0.5, y: 0.5, radius: 0.1 };
    expect(isPointInAnswerRegion({ x: 0.55, y: 0.55 }, region)).toBe(true);
    expect(isPointInAnswerRegion({ x: 0.7, y: 0.7 }, region)).toBe(false);
  });

  it("keeps the shared deadline independent from wrong answers", () => {
    expect(getRemainingTimeMs(60_000, 10_000, 2)).toBe(50_000);
    expect(getRemainingTimeMs(10_000, 20_000, 0)).toBe(0);
  });
});

describe("determineWinner", () => {
  const player = (overrides: Partial<PlayerResult>): PlayerResult => ({
    playerId: "first",
    foundCount: 3,
    wrongAnswerCount: 0,
    lastCorrectAtMs: 1_000,
    ...overrides,
  });

  it("prioritizes found count, then wrong answers, then answer time", () => {
    expect(determineWinner(player({}), player({ playerId: "second", foundCount: 2 }))).toBe("first");
    expect(
      determineWinner(
        player({ wrongAnswerCount: 2 }),
        player({ playerId: "second", wrongAnswerCount: 1 }),
      ),
    ).toBe("second");
    expect(
      determineWinner(
        player({ lastCorrectAtMs: 2_000 }),
        player({ playerId: "second", lastCorrectAtMs: 1_500 }),
      ),
    ).toBe("second");
  });

  it("returns null for a complete tie", () => {
    expect(determineWinner(player({}), player({ playerId: "second" }))).toBeNull();
  });
});

