import { GAME_PUZZLES } from "../apps/server/dist/game/puzzle-catalog.js";
const quote = (value) => "'" + value.replaceAll("'", "''") + "'";
console.log("-- Generated from the server catalog. Apply only to an isolated development database.\nBEGIN;");
for (const puzzle of GAME_PUZZLES) {
  const key = (kind) => `puzzles/${puzzle.id}/${puzzle.assetVersion}/runtime/${kind}.webp`;
  console.log(`INSERT INTO puzzle_catalog (pair_id, asset_version, title, original_asset_key, modified_asset_key, differences, is_active)
SELECT ${quote(puzzle.id)}, ${quote(puzzle.assetVersion)}, ${quote(puzzle.id)}, ${quote(key("original"))}, ${quote(key("modified"))}, ${quote(JSON.stringify(puzzle.differences))}::jsonb, TRUE
WHERE NOT EXISTS (SELECT 1 FROM puzzle_catalog WHERE pair_id = ${quote(puzzle.id)})
ON CONFLICT (pair_id, asset_version) DO NOTHING;`);
}
console.log("COMMIT;");
