import { createGameServer } from "./server.js";

const host = process.env.HOST ?? "0.0.0.0";
const port = Number.parseInt(process.env.PORT ?? "3001", 10);
const webOrigin = process.env.WEB_ORIGIN ?? "http://localhost:5173";
const app = await createGameServer({ webOrigin });

try {
  await app.listen({ host, port });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}

