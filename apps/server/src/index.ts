import { createGameServer } from "./server.js";
import { InMemoryMatchStore, PostgresMatchStore } from "./match-store.js";
import {
  GAME_SCENE_IDS,
  type GameSceneId,
} from "@spot-battle/shared";

const host = process.env.HOST ?? "0.0.0.0";
const port = Number.parseInt(process.env.PORT ?? "3001", 10);
const webOrigin = process.env.WEB_ORIGIN ?? "http://localhost:5173";
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
const matchStore = process.env.DATABASE_URL
  ? new PostgresMatchStore(process.env.DATABASE_URL)
  : new InMemoryMatchStore();
const app = await createGameServer({ webOrigin, matchStore, sceneId });

try {
  await app.listen({ host, port });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
