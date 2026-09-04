import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  GAME_PUZZLE_ASSET_MANIFEST,
  GAME_PUZZLE_IDS,
} from "@spot-battle/shared";
import { describe, expect, it } from "vitest";
import { GAME_PUZZLE_VISUALS } from "./catalog";

describe("puzzle asset manifest", () => {
  it("covers every active web puzzle with the shared metadata object", () => {
    expect(Object.keys(GAME_PUZZLE_VISUALS).sort()).toEqual([...GAME_PUZZLE_IDS].sort());

    for (const puzzleId of GAME_PUZZLE_IDS) {
      expect(GAME_PUZZLE_VISUALS[puzzleId].metadata).toBe(GAME_PUZZLE_ASSET_MANIFEST[puzzleId]);
      expect(GAME_PUZZLE_ASSET_MANIFEST[puzzleId].version).toMatch(/^\d{4}-\d{2}-\d{2}\.\d+$/);
    }
  });

  it("matches every deployed file hash and keeps each pair distinct", async () => {
    for (const puzzleId of GAME_PUZZLE_IDS) {
      const metadata = GAME_PUZZLE_ASSET_MANIFEST[puzzleId];
      expect(metadata.original.sha256).not.toBe(metadata.modified.sha256);

      for (const asset of [metadata.original, metadata.modified]) {
        const filePath = fileURLToPath(
          new URL(`../../../assets/puzzles/${asset.fileName}`, import.meta.url),
        );
        const digest = createHash("sha256").update(await readFile(filePath)).digest("hex").toUpperCase();
        expect(digest, `${puzzleId}/${asset.fileName}`).toBe(asset.sha256);
      }
    }
  });
});
