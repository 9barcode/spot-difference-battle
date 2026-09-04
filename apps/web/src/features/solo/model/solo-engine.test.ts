import { describe, expect, it } from "vitest";
import {
  bestSoloTime,
  findSoloDifference,
  formatSoloTime,
  minimumSoloHitRadius,
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

  it("uses a finger-sized touch target without relaxing mouse accuracy", () => {
    expect(minimumSoloHitRadius("mouse", 320)).toBe(0);
    expect(minimumSoloHitRadius("touch", 320)).toBe(0.075);
    expect(findSoloDifference(differences, new Set(), { x: 0.565, y: 0.5 }, 0.075)?.id)
      .toBe("clock");
  });

  it("selects the nearest answer when enlarged touch targets overlap", () => {
    const closeDifferences: SoloDifference[] = [
      { id: "clock", label: "시계", region: { x: 0.72, y: 0.31, radius: 0.04 } },
      { id: "whisk", label: "거품기", region: { x: 0.662, y: 0.34, radius: 0.04 } },
    ];
    expect(findSoloDifference(closeDifferences, new Set(), { x: 0.67, y: 0.34 }, 0.075)?.id)
      .toBe("whisk");
    expect(findSoloDifference(closeDifferences, new Set(), { x: 0.71, y: 0.31 }, 0.075)?.id)
      .toBe("clock");
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
