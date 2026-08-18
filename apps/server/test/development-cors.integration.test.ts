import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { createGameServer } from "../src/server.js";
import { LOCAL_DEVELOPMENT_WEB_ORIGIN } from "../src/web-origin.js";

describe("development CORS", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createGameServer({ webOrigin: LOCAL_DEVELOPMENT_WEB_ORIGIN });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns an allow-origin header for a private LAN web client", async () => {
    const origin = "http://192.168.0.25:5173";
    const response = await app.inject({ method: "GET", url: "/health", headers: { origin } });

    expect(response.statusCode).toBe(200);
    expect(response.headers["access-control-allow-origin"]).toBe(origin);
  });

  it("does not allow a public-address web client by default", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/health",
      headers: { origin: "http://203.0.113.10:5173" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["access-control-allow-origin"]).toBeUndefined();
  });
});
