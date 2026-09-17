import assert from "node:assert/strict";
import { describe, mock, test } from "node:test";
import { handleRequest } from "../src/index.mjs";

const originalPath = "/puzzles/home-office/2026-08-28.2/runtime/original.webp";
const modifiedPath = "/puzzles/home-office/2026-08-28.2/runtime/modified.webp";

function environment(isMissing = false) {
  const get = mock.fn(async () => isMissing ? null : ({ body: new Blob(["webp"]).stream() }));
  return { env: { PUZZLE_ASSETS: { get } }, get };
}

describe("R2 delivery canary", () => {
  for (const path of [originalPath, modifiedPath]) {
    test(`serves ${path}`, async () => {
      const { env, get } = environment();
      const response = await handleRequest(new Request(`https://canary.example${path}`), env);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("Content-Type"), "image/webp");
      assert.equal(await response.text(), "webp");
      assert.equal(get.mock.calls[0].arguments[0], path.slice(1));
    });
  }

  for (const path of [
    "/puzzles/unknown/2026-08-28.2/runtime/original.webp",
    "/puzzles/home-office/wrong/runtime/original.webp",
    "/puzzles/home-office/2026-08-28.2/runtime/extra.webp",
    "/puzzles/home-office/2026-08-28.2/runtime/%2e%2e/original.webp",
  ]) {
    test(`rejects ${path}`, async () => {
      const { env, get } = environment();
      assert.equal((await handleRequest(new Request(`https://canary.example${path}`), env)).status, 404);
      assert.equal(get.mock.callCount(), 0);
    });
  }

  test("returns 404 when an allowed object is missing", async () => {
    const { env } = environment(true);
    assert.equal((await handleRequest(new Request(`https://canary.example${originalPath}`), env)).status, 404);
  });

  for (const method of ["POST", "PUT", "DELETE", "OPTIONS"]) {
    test(`rejects ${method} without accessing R2`, async () => {
      const { env, get } = environment();
      const response = await handleRequest(new Request(`https://canary.example${originalPath}`, { method }), env);
      assert.equal(response.status, 405);
      assert.equal(get.mock.callCount(), 0);
    });
  }

  test("supports HEAD without returning a body", async () => {
    const { env } = environment();
    const response = await handleRequest(new Request(`https://canary.example${modifiedPath}`, { method: "HEAD" }), env);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("Content-Type"), "image/webp");
    assert.equal(await response.text(), "");
  });
});
