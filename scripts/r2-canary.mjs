#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const requiredEnv = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME", "R2_ENDPOINT"];
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex").toUpperCase();
const missing = (e) => e?.$metadata?.httpStatusCode === 404 || e?.name === "NotFound" || e?.name === "NoSuchKey";

export async function runCanary({ args = process.argv.slice(2), env = process.env, root = process.cwd(),
  clientFactory, log = console.log, error = console.error } = {}) {
  const options = args.filter((a) => a.startsWith("--"));
  const ids = args.filter((a) => !a.startsWith("--"));
  if (ids.length !== 1 || options.length !== 1 || !["--dry-run", "--upload"].includes(options[0])) {
    error("Usage: pnpm r2:canary <puzzle-id> --dry-run|--upload");
    return 2;
  }
  const id = ids[0];
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) { error("Invalid puzzleId"); return 1; }
  try {
    const source = await readFile(path.join(root, "packages/shared/src/puzzles/asset-manifest.ts"), "utf8");
    const pattern = new RegExp(`"${id}"\\s*:\\s*\\{[^}]*?version:\\s*"([^"\\n]+)"[^}]*?original:\\s*webp\\("([^"\\n]+)",\\s*"([A-Fa-f0-9]{64})"\\)[^}]*?modified:\\s*webp\\("([^"\\n]+)",\\s*"([A-Fa-f0-9]{64})"\\)`);
    const match = source.match(pattern);
    if (!match) throw new Error("Puzzle not found or manifest format unsupported");
    const [, version, originalFile, originalHash, modifiedFile, modifiedHash] = match;
    if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(version)) throw new Error("Invalid assetVersion");
    const targets = [
      { kind: "original", file: originalFile, expected: originalHash },
      { kind: "modified", file: modifiedFile, expected: modifiedHash },
    ];
    for (const target of targets) {
      if (path.basename(target.file) !== target.file || !target.file.endsWith(".webp")) throw new Error("Invalid manifest file name");
      target.bytes = await readFile(path.join(root, "apps/web/src/assets/puzzles", target.file));
      target.sha = hash(target.bytes);
      target.key = `puzzles/${id}/${version}/runtime/${target.kind}.webp`;
      if (target.sha !== target.expected.toUpperCase()) throw new Error(`${target.kind} local SHA-256 mismatch`);
    }
    const bucket = env.R2_BUCKET_NAME || "spot-difference-assets";
    log(`puzzleId=${id}`);
    log(`assetVersion=${version}`);
    log(`bucket=${bucket}`);
    for (const target of targets) log(`${target.key} bytes=${target.bytes.length} SHA-256=OK`);
    if (options[0] === "--dry-run") return 0;
    if (requiredEnv.some((name) => !env[name])) throw new Error("Required R2 environment variable missing");
    const endpoint = new URL(env.R2_ENDPOINT);
    if (endpoint.protocol !== "https:" || endpoint.username || endpoint.password || endpoint.search || endpoint.hash ||
        endpoint.pathname !== "/" || !endpoint.hostname.endsWith(".r2.cloudflarestorage.com") ||
        !endpoint.hostname.startsWith(`${env.R2_ACCOUNT_ID}.`)) throw new Error("Invalid R2 endpoint/account configuration");
    const { S3Client, HeadObjectCommand, PutObjectCommand, GetObjectCommand } = await import("@aws-sdk/client-s3");
    const client = clientFactory ? clientFactory() : new S3Client({
      region: "auto", endpoint: env.R2_ENDPOINT, forcePathStyle: true, maxAttempts: 1,
      credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
    });
    try {
      for (const target of targets) {
        try {
          await client.send(new HeadObjectCommand({ Bucket: bucket, Key: target.key }));
          throw new Error(`${target.kind} object already exists`);
        } catch (cause) { if (!missing(cause)) throw cause; }
      }
      for (const target of targets) await client.send(new PutObjectCommand({
        Bucket: bucket, Key: target.key, Body: target.bytes, ContentType: "image/webp", IfNoneMatch: "*",
      }));
      for (const target of targets) {
        const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: target.key }));
        if (head.ContentLength !== target.bytes.length || head.ContentType !== "image/webp") throw new Error(`${target.kind} HEAD verification failed`);
        const got = await client.send(new GetObjectCommand({ Bucket: bucket, Key: target.key }));
        if (!got.Body) throw new Error(`${target.kind} download body missing`);
        const bytes = Buffer.from(await got.Body.transformToByteArray());
        if (bytes.length !== target.bytes.length || hash(bytes) !== target.sha || target.sha !== target.expected.toUpperCase())
          throw new Error(`${target.kind} downloaded SHA-256 mismatch`);
        log(`${target.key} bytes=${bytes.length} downloaded SHA-256=OK`);
      }
      return 0;
    } finally { client.destroy?.(); }
  } catch {
    // Never serialize SDK or URL errors: they may contain request or credential details.
    error("SHA-256 verification=FAILED");
    return 1;
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  process.exitCode = await runCanary();
