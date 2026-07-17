import { createGameServer } from "./server.js";
import { InMemoryMatchStore, PostgresMatchStore } from "./match-store.js";

const host = process.env.HOST ?? "0.0.0.0";
const port = Number.parseInt(process.env.PORT ?? "3001", 10);
const webOrigin = process.env.WEB_ORIGIN ?? "http://localhost:5173";
const matchStore = process.env.DATABASE_URL
  ? new PostgresMatchStore(process.env.DATABASE_URL)
  : new InMemoryMatchStore();
const app = await createGameServer({ webOrigin, matchStore });

try {
  await app.listen({ host, port });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
