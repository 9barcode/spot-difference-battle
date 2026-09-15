import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { runCanary } from "./r2-canary.mjs";

const sha = (bytes) => createHash("sha256").update(bytes).digest("hex").toUpperCase();
const env = {
  R2_ACCOUNT_ID: "testaccount", R2_ACCESS_KEY_ID: "not-a-real-key",
  R2_SECRET_ACCESS_KEY: "not-a-real-secret", R2_BUCKET_NAME: "test-bucket",
  R2_ENDPOINT: "https://testaccount.r2.cloudflarestorage.com",
};
async function fixture(mismatch = false) {
  const root = await mkdtemp(path.join(os.tmpdir(), "r2-canary-test-"));
  const manifestDir = path.join(root, "packages/shared/src/puzzles");
  const assetDir = path.join(root, "apps/web/src/assets/puzzles");
  await mkdir(manifestDir, { recursive: true });
  await mkdir(assetDir, { recursive: true });
  const original = Buffer.from("original-webp-test");
  const modified = Buffer.from("modified-webp-test");
  await writeFile(path.join(assetDir, "original.webp"), original);
  await writeFile(path.join(assetDir, "modified.webp"), modified);
  await writeFile(path.join(manifestDir, "asset-manifest.ts"),
    `export const manifest = { "home-office": { version: "2026-08-28.2", original: webp("original.webp", "${mismatch ? "0".repeat(64) : sha(original)}"), modified: webp("modified.webp", "${sha(modified)}") } };`);
  return { root, original, modified, cleanup: () => rm(root, { recursive: true, force: true }) };
}
function mockClient({ existing = false, badDownload = false, failHead = false } = {}) {
  const objects = new Map();
  const calls = [];
  if (existing) objects.set("puzzles/home-office/2026-08-28.2/runtime/original.webp", Buffer.from("existing"));
  const client = {
    calls, objects,
    async send(command) {
      const { Bucket, Key } = command.input;
      assert.equal(Bucket, "test-bucket");
      calls.push(command.constructor.name);
      if (command.constructor.name === "HeadObjectCommand") {
        if (failHead) throw new Error("HEAD failed");
        if (!objects.has(Key)) throw Object.assign(new Error("missing"), { $metadata: { httpStatusCode: 404 } });
        return { ContentLength: objects.get(Key).length, ContentType: "image/webp" };
      }
      if (command.constructor.name === "PutObjectCommand") {
        assert.equal(command.input.IfNoneMatch, "*");
        assert.equal(command.input.ContentType, "image/webp");
        if (objects.has(Key)) throw new Error("conditional write refused");
        objects.set(Key, Buffer.from(command.input.Body));
        return {};
      }
      if (command.constructor.name === "GetObjectCommand") {
        const bytes = badDownload ? Buffer.from("corrupt") : objects.get(Key);
        return { Body: { transformToByteArray: async () => bytes } };
      }
      throw new Error("unexpected command");
    },
    destroy() {},
  };
  return client;
}
async function invoke(f, args, client, environment = env) {
  const logs = [];
  const errors = [];
  const code = await runCanary({ args, root: f.root, env: environment,
    clientFactory: () => client, log: (s) => logs.push(s), error: (s) => errors.push(s) });
  assert.doesNotMatch([...logs, ...errors].join("\n"), /not-a-real-key|not-a-real-secret/);
  return { code, logs, errors };
}
async function withFixture(fn, mismatch = false) {
  const f = await fixture(mismatch);
  try { await fn(f); } finally { await f.cleanup(); }
}

test("dry-run performs no network calls, even with credentials", () => withFixture(async (f) => {
  const client = mockClient();
  assert.equal((await invoke(f, ["home-office", "--dry-run"], client)).code, 0);
  assert.deepEqual(client.calls, []);
}));
test("no option and missing credentials refuse upload", () => withFixture(async (f) => {
  const client = mockClient();
  assert.notEqual((await invoke(f, ["home-office"], client)).code, 0);
  assert.notEqual((await invoke(f, ["home-office", "--upload"], client, {})).code, 0);
  assert.deepEqual(client.calls, []);
}));
test("unknown puzzleId refuses upload", () => withFixture(async (f) => {
  const client = mockClient();
  assert.notEqual((await invoke(f, ["unknown", "--upload"], client)).code, 0);
  assert.deepEqual(client.calls, []);
}));
test("local SHA mismatch refuses upload", () => withFixture(async (f) => {
  const client = mockClient();
  assert.notEqual((await invoke(f, ["home-office", "--upload"], client)).code, 0);
  assert.deepEqual(client.calls, []);
}, true));
test("existing object refuses both writes", () => withFixture(async (f) => {
  const client = mockClient({ existing: true });
  assert.notEqual((await invoke(f, ["home-office", "--upload"], client)).code, 0);
  assert.equal(client.calls.includes("PutObjectCommand"), false);
}));
test("successful upload checks HEAD and downloaded SHA for both files", () => withFixture(async (f) => {
  const client = mockClient();
  const result = await invoke(f, ["home-office", "--upload"], client);
  assert.equal(result.code, 0, result.errors.join("\n"));
  assert.equal(client.calls.filter((c) => c === "PutObjectCommand").length, 2);
  assert.equal(client.calls.filter((c) => c === "GetObjectCommand").length, 2);
  assert.equal(client.calls.filter((c) => c === "HeadObjectCommand").length, 4);
}));
test("downloaded SHA mismatch is failure", () => withFixture(async (f) => {
  const client = mockClient({ badDownload: true });
  assert.notEqual((await invoke(f, ["home-office", "--upload"], client)).code, 0);
}));
test("failed HEAD is not mistaken for absent object", () => withFixture(async (f) => {
  const client = mockClient({ failHead: true });
  assert.notEqual((await invoke(f, ["home-office", "--upload"], client)).code, 0);
  assert.equal(client.calls.includes("PutObjectCommand"), false);
}));
