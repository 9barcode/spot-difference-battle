import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { SOLO_DIFFERENCE_COUNT } from "../model/solo-engine";
import { SOLO_PUZZLES, SOLO_PUZZLE_IDS } from "./catalog";

describe("solo puzzle catalog", () => {
  it("contains five distinct hard puzzles with five differences each", () => {
    expect(SOLO_PUZZLES).toHaveLength(5);
    expect(SOLO_PUZZLES.map((puzzle) => puzzle.id)).toEqual(SOLO_PUZZLE_IDS);

    for (const puzzle of SOLO_PUZZLES) {
      expect(puzzle.originalSrc).not.toBe(puzzle.modifiedSrc);
      expect(puzzle.differences).toHaveLength(SOLO_DIFFERENCE_COUNT);
      expect(new Set(puzzle.differences.map((difference) => difference.id)).size)
        .toBe(SOLO_DIFFERENCE_COUNT);
      for (const difference of puzzle.differences) {
        expect(difference.region.x).toBeGreaterThanOrEqual(0);
        expect(difference.region.x).toBeLessThanOrEqual(1);
        expect(difference.region.y).toBeGreaterThanOrEqual(0);
        expect(difference.region.y).toBeLessThanOrEqual(1);
        expect(difference.region.radius).toBeLessThanOrEqual(0.055);
      }
    }
  });

  it("matches the versioned asset hashes", async () => {
    for (const puzzle of SOLO_PUZZLES) {
      expect(puzzle.metadata.generator).toBe("OpenAI ImageGen");
      expect(puzzle.metadata.version).toMatch(/^\d{4}-\d{2}-\d{2}\.\d+$/);
      for (const asset of [puzzle.metadata.original, puzzle.metadata.modified]) {
        const path = fileURLToPath(new URL(`../../../assets/puzzles/solo/${asset.fileName}`, import.meta.url));
        const digest = createHash("sha256").update(await readFile(path)).digest("hex").toUpperCase();
        expect(digest, `${puzzle.id}/${asset.fileName}`).toBe(asset.sha256);
      }
    }
  });
});
