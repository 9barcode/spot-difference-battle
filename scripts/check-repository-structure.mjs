import { access, readdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import process from "node:process";

const repositoryRoot = process.cwd();
const ignoredDirectories = new Set([".git", "node_modules", "dist"]);

const requiredPaths = [
  "apps/web",
  "apps/server",
  "packages/game-core",
  "packages/shared",
  "tests",
  "docs/history",
];

const forbiddenPaths = [
  "UI",
  "e2e",
  ".payload",
  "foo.tmp",
];

async function exists(relativePath) {
  try {
    await access(path.join(repositoryRoot, relativePath));
    return true;
  } catch {
    return false;
  }
}

async function findFiles(directory, predicate) {
  const matches = [];

  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;

    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      matches.push(...await findFiles(entryPath, predicate));
    } else if (predicate(entryPath)) {
      matches.push(entryPath);
    }
  }

  return matches;
}

const failures = [];

for (const requiredPath of requiredPaths) {
  if (!await exists(requiredPath)) {
    failures.push(`missing required path: ${requiredPath}`);
  }
}

for (const forbiddenPath of forbiddenPaths) {
  if (await exists(forbiddenPath)) {
    failures.push(`legacy path must not return: ${forbiddenPath}`);
  }
}

const sourceTests = await findFiles(
  path.join(repositoryRoot, "apps/server/src"),
  (filePath) => /\.(test|spec)\.[cm]?[jt]sx?$/.test(filePath),
);
for (const sourceTest of sourceTests) {
  failures.push(
    `server test belongs under apps/server/test: ${path.relative(repositoryRoot, sourceTest)}`,
  );
}

const trackedBuildArtifacts = execFileSync("git", ["ls-files", "*.ait"], {
  cwd: repositoryRoot,
  encoding: "utf8",
}).trim().split("\n").filter(Boolean);
for (const artifact of trackedBuildArtifacts) {
  failures.push(
    `generated Apps in Toss bundle must not be tracked: ${artifact}`,
  );
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log("Repository structure is valid.");
}
