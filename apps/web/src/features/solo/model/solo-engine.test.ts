import { describe, expect, it } from "vitest";
import {
  bestSoloTime,
  findSoloDifference,
  formatSoloTime,
  soloElapsedMs,
  type SoloDifference,
} from "./solo-engine";

const differences: SoloDifference[] = [
  { id: "clock", label: "시계", region: { x: 0.5, y: 0.5, radius: 0.05 } },
];

describe("solo time attack engine", () => {
  it("uses a tight circular hit area and ignores an already found difference", () => {
    expect(findSoloDifference(differences, new Set(), { x: 0.53, y: 0.52 })?.id).toBe("clock");
    expect(findSoloDifference(differences, new Set(), { x: 0.56, y: 0.5 })).toBeNull();
    expect(findSoloDifference(differences, new Set(["clock"]), { x: 0.5, y: 0.5 })).toBeNull();
  });

  it("adds three seconds per wrong answer", () => {
    expect(soloElapsedMs(1_000, 11_000, 2)).toBe(16_000);
  });

  it("keeps the shorter personal record", () => {
    expect(bestSoloTime(null, 21_340)).toBe(21_340);
    expect(bestSoloTime(21_340, 24_000)).toBe(21_340);
    expect(bestSoloTime(21_340, 19_120)).toBe(19_120);
    expect(formatSoloTime(19_120)).toBe("19.12초");
  });
});
