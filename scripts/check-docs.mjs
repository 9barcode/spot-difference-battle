import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const ignoredDirectories = new Set([".git", "node_modules", "dist", "playwright-report", "test-results"]);

function collectMarkdown(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (ignoredDirectories.has(entry.name)) return [];
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return collectMarkdown(path);
    return entry.isFile() && entry.name.endsWith(".md") ? [path] : [];
  });
}

const files = collectMarkdown(root);
const errors = [];

for (const file of files) {
  const text = readFileSync(file, "utf8");
  const name = relative(root, file).replaceAll("\\", "/");
  const header = text.split(/\r?\n/).slice(0, 10).join("\n");

  for (const match of text.matchAll(/(?<!!)\[[^\]]+]\(([^)]+)\)/g)) {
    const target = match[1].replace(/^<|>$/g, "").split("#")[0];
    if (!target || /^(https?:\/\/|mailto:)/.test(target)) continue;
    if (!existsSync(resolve(dirname(file), decodeURIComponent(target)))) {
      errors.push(`${name}: broken link ${match[1]}`);
    }
  }

  if (/^docs\/CHANGES_.*\.md$/.test(name) && !header.includes("문서 상태: HISTORICAL")) {
    errors.push(`${name}: change history must be HISTORICAL`);
  }

  if (header.includes("문서 상태: CURRENT") && !header.includes("기준일:")) {
    errors.push(`${name}: CURRENT document requires a baseline date`);
  }

  const isCurrent = header.includes("문서 상태: CURRENT");
  const mayOwnExecutionCounts = name === "docs/VERIFICATION_EVIDENCE.md";
  if (isCurrent && !mayOwnExecutionCounts && /(?:테스트\s*)?\d+개\s*(?:통과|건너뜀)/.test(text)) {
    errors.push(`${name}: execution counts belong in docs/VERIFICATION_EVIDENCE.md`);
  }
}

const reviewPath = join(root, "docs", "REVIEW_REQUIRED.md");
const backlogPath = join(root, "docs", "IMPLEMENTATION_BACKLOG.md");
const review = readFileSync(reviewPath, "utf8");
const backlog = readFileSync(backlogPath, "utf8");
const reviewSections = review.split(/^### /m).slice(1);
for (const section of reviewSections) {
  const id = section.match(/^(REV-\d+)/)?.[1];
  if (!id || !/^- 상태: `RESOLVED`/m.test(section)) continue;
  if (new RegExp(`^- \\[ \\].*\\(${id}[^)]*\\)`, "m").test(backlog)) {
    errors.push(`docs/IMPLEMENTATION_BACKLOG.md: ${id} is resolved but still unchecked`);
  }
}

if (errors.length) {
  console.error(`Documentation check failed (${errors.length})`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Documentation check passed (${files.length} Markdown files)`);
