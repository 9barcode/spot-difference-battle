import assert from "node:assert/strict";
import { describe, mock, test } from "node:test";
import { handleRequest } from "../src/index.mjs";

const originalPath = "/puzzles/home-office/2026-08-28.2/runtime/original.webp";
const modifiedPath = "/puzzles/home-office/2026-08-28.2/runtime/modified.webp";

function environment(isMissing = false) {
  const get = mock.fn(async () => isMissing ? null : ({ body: new Blob(["webp"]).stream() }));
  return { env: { PUZZLE_ASSETS: { get } }, get };
}

/** 로그를 모아 outcome 을 확인한다. */
function recorder() {
  const lines = [];
  const log = (outcome, detail) => lines.push({ outcome, ...detail });
  return { log, lines };
}

describe("R2 delivery canary", () => {
  for (const path of [originalPath, modifiedPath]) {
    test(`serves ${path}`, async () => {
      const { env, get } = environment();
      const response = await handleRequest(new Request(`https://canary.example${path}`), env);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("Content-Type"), "image/webp");
      assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff");
      assert.equal(await response.text(), "webp");
      assert.equal(get.mock.calls[0].arguments[0], path.slice(1));
    });
  }

  test("supports HEAD without returning a body", async () => {
    const { env } = environment();
    const response = await handleRequest(new Request(`https://canary.example${modifiedPath}`, { method: "HEAD" }), env);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("Content-Type"), "image/webp");
    assert.equal(await response.text(), "");
  });

  for (const method of ["POST", "PUT", "DELETE", "OPTIONS"]) {
    test(`rejects ${method} without accessing R2`, async () => {
      const { env, get } = environment();
      const response = await handleRequest(new Request(`https://canary.example${originalPath}`, { method }), env);
      assert.equal(response.status, 405);
      assert.equal(response.headers.get("Allow"), "GET, HEAD");
      assert.equal(get.mock.callCount(), 0);
    });
  }
});

/**
 * OWNERSHIP.md 완료 기준:
 * "없는 객체, 잘못된 버전과 traversal 입력을 구분 가능한 상태 코드로 처리한다."
 *
 * 이전에는 네 경우가 모두 404 라 로그에서 운영 사고를 골라낼 수 없었다.
 */
describe("거부 사유별 상태 코드", () => {
  const badPaths = [
    ["잘못된 버전 형식", "/puzzles/home-office/wrong/runtime/original.webp"],
    ["알 수 없는 kind", "/puzzles/home-office/2026-08-28.2/runtime/extra.webp"],
    ["traversal", "/puzzles/home-office/2026-08-28.2/runtime/%2e%2e/original.webp"],
    ["대문자 섞임", "/Puzzles/home-office/2026-08-28.2/runtime/original.webp"],
    ["끝에 슬래시", `${originalPath}/`],
    ["쿼리스트링", `${originalPath}?v=1`],
  ];

  for (const [label, path] of badPaths) {
    test(`400 — ${label}`, async () => {
      const { env, get } = environment();
      const { log, lines } = recorder();
      const response = await handleRequest(new Request(`https://canary.example${path}`), env, { log });
      assert.equal(response.status, 400);
      assert.equal(get.mock.callCount(), 0, "형식 위반은 R2 조회 전에 거부해야 한다");
      assert.equal(lines[0].outcome, "bad_path");
    });
  }

  test("404 — 형식은 맞지만 서빙 대상이 아닌 퍼즐", async () => {
    const { env, get } = environment();
    const { log, lines } = recorder();
    const response = await handleRequest(
      new Request("https://canary.example/puzzles/unknown/2026-08-28.2/runtime/original.webp"),
      env,
      { log },
    );
    assert.equal(response.status, 404);
    assert.equal(get.mock.callCount(), 0);
    assert.equal(lines[0].outcome, "not_allowed");
    assert.equal(lines[0].pairId, "unknown");
  });

  test("404 — 형식은 맞지만 허용되지 않은 버전", async () => {
    const { env, get } = environment();
    const { log, lines } = recorder();
    const response = await handleRequest(
      new Request("https://canary.example/puzzles/home-office/2099-01-01.1/runtime/original.webp"),
      env,
      { log },
    );
    assert.equal(response.status, 404);
    assert.equal(get.mock.callCount(), 0);
    assert.equal(lines[0].outcome, "not_allowed");
    assert.equal(lines[0].assetVersion, "2099-01-01.1");
  });

  test("502 — 허용된 경로인데 R2 에 객체가 없다", async () => {
    const { env, get } = environment(true);
    const { log, lines } = recorder();
    const response = await handleRequest(new Request(`https://canary.example${originalPath}`), env, { log });
    assert.equal(response.status, 502, "운영 사고는 정상 거부와 구분돼야 한다");
    assert.equal(get.mock.callCount(), 1, "허용된 경로이므로 R2 조회까지는 간다");
    assert.equal(lines[0].outcome, "asset_missing");
  });

  test("네 사유가 서로 다른 상태 코드를 쓴다", async () => {
    const statuses = new Set();
    for (const [path, missing] of [
      ["/puzzles/home-office/2026-08-28.2/runtime/%2e%2e/x.webp", false],
      ["/puzzles/unknown/2026-08-28.2/runtime/original.webp", false],
      [originalPath, true],
      [originalPath, false],
    ]) {
      const { env } = environment(missing);
      const response = await handleRequest(new Request(`https://canary.example${path}`), env, { log: () => {} });
      statuses.add(response.status);
    }
    assert.equal(statuses.size, 4, `구분 가능해야 한다: ${[...statuses]}`);
  });
});

describe("관측", () => {
  test("결과별로 로그 심각도가 갈린다", async () => {
    const sink = { log: mock.fn(), warn: mock.fn(), error: mock.fn() };
    const { createLogger } = await import("../src/index.mjs");
    const log = createLogger(sink);

    const { env: okEnv } = environment();
    await handleRequest(new Request(`https://canary.example${originalPath}`), okEnv, { log });
    const { env: missingEnv } = environment(true);
    await handleRequest(new Request(`https://canary.example${originalPath}`), missingEnv, { log });
    await handleRequest(new Request("https://canary.example/nope"), okEnv, { log });

    assert.equal(sink.log.mock.callCount(), 1, "정상은 log");
    assert.equal(sink.error.mock.callCount(), 1, "R2 miss 는 error");
    assert.equal(sink.warn.mock.callCount(), 1, "거부는 warn");
  });

  test("로그가 JSON 한 줄이고 경로 조각만 담는다", async () => {
    const sink = { log: mock.fn(), warn: mock.fn(), error: mock.fn() };
    const { createLogger } = await import("../src/index.mjs");
    const { env } = environment();
    await handleRequest(
      new Request(`https://canary.example${originalPath}`, { headers: { Cookie: "secret=1" } }),
      env,
      { log: createLogger(sink) },
    );
    const line = sink.log.mock.calls[0].arguments[0];
    const parsed = JSON.parse(line);
    assert.equal(parsed.event, "asset_request");
    assert.equal(parsed.outcome, "ok");
    assert.equal(parsed.pairId, "home-office");
    assert.ok(!line.includes("secret"), "요청 헤더를 로그에 남기면 안 된다");
    assert.ok(!line.includes("canary.example"), "전체 URL 을 남기지 않는다");
  });
});
