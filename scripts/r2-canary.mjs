#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const DEFAULT_BUCKET = "spot-difference-assets";
const DEFAULT_PUZZLE_ID = "cozy-cafe";
const REQUIRED_ENV = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
  "R2_ENDPOINT",
];

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const puzzleId = args.find((arg) => !arg.startsWith("--")) ?? DEFAULT_PUZZLE_ID;

if (!dryRun) {
  console.error("Refusing network upload: this branch currently supports dry-run validation only.");
  console.error("Run: pnpm r2:canary <puzzle-id> --dry-run");
  process.exit(2);
}

const repoRoot = process.cwd();
const manifestPath = path.join(repoRoot, "packages/shared/src/puzzles/asset-manifest.ts");
const assetsDir = path.join(repoRoot, "apps/web/src/assets/puzzles");

const manifestSource = await readFile(manifestPath, "utf8");
const escapedId = puzzleId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const entryPattern = new RegExp(
  `"${escapedId}"\\s*:\\s*\\{[\\s\\S]*?version:\\s*"([^"]+)"[\\s\\S]*?original:\\s*webp\\("([^"]+)",\\s*"([A-Fa-f0-9]{64})"\\)[\\s\\S]*?modified:\\s*webp\\("([^"]+)",\\s*"([A-Fa-f0-9]{64})"\\)`,
);
const match = manifestSource.match(entryPattern);

if (!match) {
  console.error(`Puzzle not found or manifest format unsupported: ${puzzleId}`);
  process.exit(1);
}

const [, assetVersion, originalFile, originalExpectedHash, modifiedFile, modifiedExpectedHash] = match;

const targets = [
  { kind: "original", fileName: originalFile, expectedHash: originalExpectedHash },
  { kind: "modified", fileName: modifiedFile, expectedHash: modifiedExpectedHash },
];

for (const target of targets) {
  const sourcePath = path.join(assetsDir, target.fileName);
  const bytes = await readFile(sourcePath);
  const actualHash = createHash("sha256").update(bytes).digest("hex").toUpperCase();

  if (actualHash !== target.expectedHash.toUpperCase()) {
    console.error(`SHA-256 mismatch for ${target.fileName}`);
    console.error(`expected=${target.expectedHash.toUpperCase()}`);
    console.error(`actual=${actualHash}`);
    process.exit(1);
  }

  target.sourcePath = path.relative(repoRoot, sourcePath).replaceAll("\\", "/");
  target.size = bytes.length;
  target.sha256 = actualHash;
  target.objectKey = `puzzles/${puzzleId}/${assetVersion}/runtime/${target.kind}.webp`;
}

const missingEnv = REQUIRED_ENV.filter((name) => !process.env[name]);
const bucket = process.env.R2_BUCKET_NAME || DEFAULT_BUCKET;

console.log("R2 canary dry-run OK");
console.log(`puzzleId=${puzzleId}`);
console.log(`assetVersion=${assetVersion}`);
console.log(`bucket=${bucket}`);
console.log(`credentials=${missingEnv.length === 0 ? "present" : `missing:${missingEnv.join(",")}`}`);
for (const target of targets) {
  console.log(`${target.kind}.source=${target.sourcePath}`);
  console.log(`${target.kind}.key=${target.objectKey}`);
  console.log(`${target.kind}.bytes=${target.size}`);
  console.log(`${target.kind}.sha256=${target.sha256}`);
}

if (missingEnv.length > 0) {
  console.log("Note: credentials are optional for dry-run and are only reported by variable name.");
}
