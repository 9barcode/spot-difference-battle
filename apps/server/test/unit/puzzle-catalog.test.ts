import { describe, expect, it } from "vitest";
import { GAME_PUZZLES } from "../../src/game/puzzle-catalog.js";
import { parseCatalog, type CatalogRow } from "../../src/persistence/puzzle-catalog.js";

function row(): CatalogRow {
  const puzzle = GAME_PUZZLES.find((p) => p.id === "home-office")!;
  return {
    pair_id: puzzle.id, asset_version: puzzle.assetVersion,
    original_asset_key: `puzzles/${puzzle.id}/${puzzle.assetVersion}/runtime/original.webp`,
    modified_asset_key: `puzzles/${puzzle.id}/${puzzle.assetVersion}/runtime/modified.webp`,
    differences: structuredClone(puzzle.differences),
  };
}
describe("database puzzle contract", () => {
  it("maps DB identity and preserves an independent answer snapshot", () => {
    const input = row();
    const parsed = parseCatalog([input]);
    expect(parsed[0]).toEqual(GAME_PUZZLES.find((p) => p.id === "home-office"));
    expect(parsed[0]!.differences).not.toBe(input.differences);
  });
  it("rejects empty, duplicate, unsupported and incompatible catalogs", () => {
    expect(() => parseCatalog([])).toThrow();
    expect(() => parseCatalog([row(), row()])).toThrow();
    for (const patch of [{pair_id: "unknown"}, {asset_version: "wrong"}, {original_asset_key: "https://wrong"}, {differences: []}, {differences: [{id: "a", label: "a", regions: [{x: 2, y: 0, radius: 0.1}]}]}]) {
      expect(() => parseCatalog([{...row(), ...patch}])).toThrow();
    }
  });
});
