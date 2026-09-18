import assert from "node:assert/strict";
import { describe, mock, test } from "node:test";
import { handleRequest } from "../src/index.mjs";

const originalPath = "/puzzles/home-office/2026-08-28.2/runtime/original.webp";
const modifiedPath = "/puzzles/home-office/2026-08-28.2/runtime/modified.webp";
const immutableCache = "public, max-age=31536000, immutable";

function environment(isMissing = false) {
  const get = mock.fn(async () => isMissing ? null : ({ body: new Blob(["webp"]).stream() }));
  const put = mock.fn();
  const remove = mock.fn();
  const list = mock.fn();
  return { env: { PUZZLE_ASSETS: { get, put, delete: remove, list } }, get, put, remove, list };
}

function assertNoStore(response) {
  assert.equal(response.headers.get("Cache-Control"), "no-store");
}

describe("R2 delivery canary", () => {
  for (const path of [originalPath, modifiedPath]) {
    test(`serves ${path}`, async () => {
      const { env, get } = environment();
      const response = await handleRequest(new Request(`https://canary.example${path}`), env);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("Content-Type"), "image/webp");
      assert.equal(response.headers.get("Cache-Control"), immutableCache);
      assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff");
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
      const response = await handleRequest(new Request(`https://canary.example${path}`), env);
      assert.equal(response.status, 404);
      assertNoStore(response);
      assert.equal(get.mock.callCount(), 0);
    });
  }

  test("returns 404 when an allowed object is missing", async () => {
    const { env } = environment(true);
    const response = await handleRequest(new Request(`https://canary.example${originalPath}`), env);
    assert.equal(response.status, 404);
    assertNoStore(response);
  });

  for (const method of ["POST", "PUT", "DELETE", "OPTIONS"]) {
    test(`rejects ${method} without accessing R2`, async () => {
      const { env, get } = environment();
      const response = await handleRequest(new Request(`https://canary.example${originalPath}`, { method }), env);
      assert.equal(response.status, 405);
      assertNoStore(response);
      assert.equal(response.headers.get("Allow"), "GET, HEAD");
      assert.equal(get.mock.callCount(), 0);
    });
  }

  test("supports HEAD without returning a body", async () => {
    const { env } = environment();
    const response = await handleRequest(new Request(`https://canary.example${modifiedPath}`, { method: "HEAD" }), env);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("Content-Type"), "image/webp");
    assert.equal(response.headers.get("Cache-Control"), immutableCache);
    assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff");
    assert.equal(await response.text(), "");
  });

  test("returns a generic no-store error when R2 fails without attempting writes", async () => {
    const { env, get, put, remove, list } = environment();
    get.mock.mockImplementation(async () => { throw new Error("private object detail"); });
    const response = await handleRequest(new Request(`https://canary.example${originalPath}`), env);
    assert.equal(response.status, 500);
    assertNoStore(response);
    assert.equal(await response.text(), "Internal Server Error");
    assert.equal(put.mock.callCount(), 0);
    assert.equal(remove.mock.callCount(), 0);
    assert.equal(list.mock.callCount(), 0);
  });
});