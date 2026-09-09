import { createGameServer } from "./server.js";
import { SupabasePostgresMatchStore } from "./persistence/match-store.js";
import {
  GAME_SCENE_IDS,
  type GameSceneId,
} from "@spot-battle/shared";
import { resolveWebOrigin } from "./config/web-origin.js";

const host = process.env.HOST ?? "0.0.0.0";
const port = Number.parseInt(process.env.PORT ?? "3001", 10);
const webOrigin = resolveWebOrigin(process.env.WEB_ORIGIN, process.env.NODE_ENV);
const staticRoot = process.env.WEB_ROOT?.trim() || undefined;
const configuredSceneId = process.env.GAME_SCENE_ID?.trim();
if (
  configuredSceneId &&
  !GAME_SCENE_IDS.includes(configuredSceneId as GameSceneId)
) {
  throw new Error(
    `GAME_SCENE_ID must be one of: ${GAME_SCENE_IDS.join(", ")}`,
  );
}
const sceneId = configuredSceneId as GameSceneId | undefined;
const supabaseDatabaseUrl = process.env.SUPABASE_DB_URL?.trim();
if (!supabaseDatabaseUrl) {
  throw new Error(
    "SUPABASE_DB_URL is required. Production does not fall back to an in-memory database.",
  );
}
const matchStore = new SupabasePostgresMatchStore(supabaseDatabaseUrl);
const app = await createGameServer({
  webOrigin,
  staticRoot,
  matchStore,
  sceneId,
});

try {
  await app.listen({ host, port });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
