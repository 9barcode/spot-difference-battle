import { describe, expect, it } from "vitest";
import {
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

