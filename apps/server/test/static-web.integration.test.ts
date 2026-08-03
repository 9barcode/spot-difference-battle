import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import { createGameServer } from "../src/server.js";

describe("production static web", () => {
  let app: FastifyInstance | undefined;
  let staticRoot: string | undefined;

  afterEach(async () => {
    await app?.close();
    if (staticRoot) await rm(staticRoot, { recursive: true, force: true });
  });

  it("serves the built web entry and keeps the health endpoint available", async () => {
    staticRoot = await mkdtemp(join(tmpdir(), "spot-battle-web-"));
    await writeFile(join(staticRoot, "index.html"), "<main>spot battle</main>");
    app = await createGameServer({ staticRoot });

    const home = await app.inject({ method: "GET", url: "/" });
    const health = await app.inject({ method: "GET", url: "/health" });

    expect(home.statusCode).toBe(200);
    expect(home.body).toContain("spot battle");
    expect(health.statusCode).toBe(200);
    expect(health.json()).toMatchObject({ status: "ok", server: "ok" });
  });
});
