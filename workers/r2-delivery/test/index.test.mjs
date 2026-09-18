import assert from "node:assert/strict";
import { describe, mock, test } from "node:test";
import { createLogger, handleRequest } from "../src/index.mjs";

const originalPath = "/puzzles/home-office/2026-08-28.2/runtime/original.webp";
const modifiedPath = "/puzzles/home-office/2026-08-28.2/runtime/modified.webp";
const immutableCache = "public, max-age=31536000, immutable";

function environment({ missing = false, failure = null, httpEtag = '"abc123"' } = {}) {
  const get = mock.fn(async () => {
    if (failure) throw failure;
    return missing ? null : { body: new Blob(["webp"]).stream(), httpEtag };
  });
  const put = mock.fn();
  const remove = mock.fn();
  const list = mock.fn();
  return { env: { PUZZLE_ASSETS: { get, put, delete: remove, list } }, get, put, remove, list };
}

function recorder() {
  const lines = [];
  return { log: (outcome, detail) => lines.push({ outcome, ...detail }), lines };
}

function assertFailure(response, status) {
  assert.equal(response.status, status);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff");
}

function assertNoMutations({ put, remove, list }) {
  assert.equal(put.mock.callCount(), 0);
  assert.equal(remove.mock.callCount(), 0);
  assert.equal(list.mock.callCount(), 0);
}

describe("R2 delivery worker integration", () => {
  for (const path of [originalPath, modifiedPath]) {
    test(`serves only the allowed asset ${path}`, async () => {
      const context = environment();
      const response = await handleRequest(new Request(`https://canary.example${path}`), context.env, { log: () => {} });
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("Content-Type"), "image/webp");
      assert.equal(response.headers.get("Cache-Control"), immutableCache);
      assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff");
      assert.equal(response.headers.get("ETag"), '"abc123"');
      assert.equal(await response.text(), "webp");
      assert.equal(context.get.mock.calls[0].arguments[0], path.slice(1));
      assertNoMutations(context);
    });
  }

  test("supports HEAD with success headers and no body", async () => {
    const context = environment();
    const response = await handleRequest(new Request(`https://canary.example${modifiedPath}`, { method: "HEAD" }), context.env, { log: () => {} });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("Content-Type"), "image/webp");
    assert.equal(response.headers.get("Cache-Control"), immutableCache);
    assert.equal(response.headers.get("ETag"), '"abc123"');
    assert.equal(await response.text(), "");
    assertNoMutations(context);
  });

  for (const method of ["POST", "PUT", "DELETE", "OPTIONS"]) {
    test(`rejects ${method} before R2 access`, async () => {
      const context = environment();
      const response = await handleRequest(new Request(`https://canary.example${originalPath}`, { method }), context.env, { log: () => {} });
      assertFailure(response, 405);
      assert.equal(response.headers.get("Allow"), "GET, HEAD");
      assert.equal(context.get.mock.callCount(), 0);
      assertNoMutations(context);
    });
  }

  for (const [label, path] of [
    ["wrong version format", "/puzzles/home-office/wrong/runtime/original.webp"],
    ["unknown runtime object", "/puzzles/home-office/2026-08-28.2/runtime/extra.webp"],
    ["traversal", "/puzzles/home-office/2026-08-28.2/runtime/%2e%2e/original.webp"],
    ["uppercase path", "/Puzzles/home-office/2026-08-28.2/runtime/original.webp"],
    ["trailing slash", `${originalPath}/`],
    ["query string", `${originalPath}?v=1`],
  ]) {
    test(`rejects malformed path: ${label}`, async () => {
      const context = environment();
      const { log, lines } = recorder();
      const response = await handleRequest(new Request(`https://canary.example${path}`), context.env, { log });
      assertFailure(response, 400);
      assert.equal(context.get.mock.callCount(), 0);
      assert.equal(lines[0].outcome, "bad_path");
      assertNoMutations(context);
    });
  }

  for (const [label, path] of [
    ["unknown puzzle", "/puzzles/unknown/2026-08-28.2/runtime/original.webp"],
    ["unsupported version", "/puzzles/home-office/2099-01-01.1/runtime/original.webp"],
  ]) {
    test(`rejects allowed-format but unsupported asset: ${label}`, async () => {
      const context = environment();
      const { log, lines } = recorder();
      const response = await handleRequest(new Request(`https://canary.example${path}`), context.env, { log });
      assertFailure(response, 404);
      assert.equal(context.get.mock.callCount(), 0);
      assert.equal(lines[0].outcome, "not_allowed");
      assertNoMutations(context);
    });
  }

  test("returns safe 502 for an allowed but missing R2 object", async () => {
    const context = environment({ missing: true });
    const { log, lines } = recorder();
    const response = await handleRequest(new Request(`https://canary.example${originalPath}`), context.env, { log });
    assertFailure(response, 502);
    assert.equal(await response.text(), "Bad Gateway");
    assert.equal(context.get.mock.callCount(), 1);
    assert.equal(lines[0].outcome, "asset_missing");
    assertNoMutations(context);
  });

  test("returns a generic 500 without exposing an R2 exception", async () => {
    const context = environment({ failure: new Error("private object detail") });
    const { log, lines } = recorder();
    const response = await handleRequest(new Request(`https://canary.example${originalPath}`), context.env, { log });
    assertFailure(response, 500);
    assert.equal(await response.text(), "Internal Server Error");
    assert.ok(!JSON.stringify(lines).includes("private object detail"));
    assert.equal(lines[0].outcome, "internal_error");
    assertNoMutations(context);
  });

  test("returns 304 only when the R2 ETag matches If-None-Match", async () => {
    const context = environment();
    const response = await handleRequest(new Request(`https://canary.example${originalPath}`, { headers: { "If-None-Match": '"abc123"' } }), context.env, { log: () => {} });
    assert.equal(response.status, 304);
    assert.equal(response.headers.get("ETag"), '"abc123"');
    assert.equal(response.headers.get("Cache-Control"), immutableCache);
    assert.equal(await response.text(), "");
  });

  test("returns the body when If-None-Match is stale", async () => {
    const context = environment();
    const response = await handleRequest(new Request(`https://canary.example${originalPath}`, { headers: { "If-None-Match": '"stale"' } }), context.env, { log: () => {} });
    assert.equal(response.status, 200);
    assert.equal(await response.text(), "webp");
  });

  test("omits ETag when R2 provides no ETag metadata", async () => {
    const context = environment({ httpEtag: null });
    const response = await handleRequest(new Request(`https://canary.example${originalPath}`), context.env, { log: () => {} });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("ETag"), null);
  });

  test("structured logs use safe fragments and severity", async () => {
    const sink = { log: mock.fn(), warn: mock.fn(), error: mock.fn() };
    const log = createLogger(sink);
    await handleRequest(new Request(`https://canary.example${originalPath}`, { headers: { Cookie: "secret=1" } }), environment().env, { log });
    await handleRequest(new Request("https://canary.example/nope"), environment().env, { log });
    await handleRequest(new Request(`https://canary.example${originalPath}`), environment({ missing: true }).env, { log });
    assert.equal(sink.log.mock.callCount(), 1);
    assert.equal(sink.warn.mock.callCount(), 1);
    assert.equal(sink.error.mock.callCount(), 1);
    const line = sink.log.mock.calls[0].arguments[0];
    const parsed = JSON.parse(line);
    assert.deepEqual({ event: parsed.event, outcome: parsed.outcome, pairId: parsed.pairId }, { event: "asset_request", outcome: "ok", pairId: "home-office" });
    assert.ok(!line.includes("secret"));
    assert.ok(!line.includes("canary.example"));
  });
});