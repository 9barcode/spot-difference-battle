import { createGameServer } from "./server.js";
import { InMemoryMatchStore, PostgresMatchStore } from "./match-store.js";
import {
  GAME_PUZZLE_IDS,
  type GamePuzzleId,
} from "@spot-battle/shared";
import { resolveWebOrigin } from "./web-origin.js";

const host = process.env.HOST ?? "0.0.0.0";
const port = Number.parseInt(process.env.PORT ?? "3001", 10);
const webOrigin = resolveWebOrigin(process.env.WEB_ORIGIN, process.env.NODE_ENV);
const staticRoot = process.env.WEB_ROOT?.trim() || undefined;
const configuredPuzzleId = process.env.GAME_PUZZLE_ID?.trim();
if (
  configuredPuzzleId &&
  !GAME_PUZZLE_IDS.includes(configuredPuzzleId as GamePuzzleId)
) {
  throw new Error(
    `GAME_PUZZLE_ID must be one of: ${GAME_PUZZLE_IDS.join(", ")}`,
  );
}
const puzzleId = configuredPuzzleId as GamePuzzleId | undefined;
const matchStore = process.env.DATABASE_URL
  ? new PostgresMatchStore(process.env.DATABASE_URL)
  : new InMemoryMatchStore();
const app = await createGameServer({
  webOrigin,
  staticRoot,
  matchStore,
  puzzleId,
});

try {
  await app.listen({ host, port });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
