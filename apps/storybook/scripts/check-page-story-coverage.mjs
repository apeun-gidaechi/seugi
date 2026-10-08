#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pagesRoot = path.resolve(__dirname, "../../web/src/Pages");
const autoDir = path.resolve(__dirname, "../stories/web/auto-pages");

function walk(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else if (entry.name.endsWith(".tsx") && !entry.name.includes(".style.")) files.push(full);
  }
  return files;
}

function hasDefaultExport(filePath) {
  return /export\s+default\s/.test(fs.readFileSync(filePath, "utf8"));
}

function storyFileName(slug) {
  return slug.replace(/\//g, "__") + ".stories.tsx";
}

const pages = walk(pagesRoot).filter(hasDefaultExport);
const stories = new Set(fs.readdirSync(autoDir).filter((name) => name.endsWith(".stories.tsx")));

const missing = [];
for (const file of pages) {
  const rel = path.relative(pagesRoot, file);
  const slug = rel
    .replace(/\.tsx$/, "")
    .split(path.sep)
    .join("/");
  const expected = storyFileName(slug);
  if (!stories.has(expected)) missing.push(rel);
}

if (missing.length > 0) {
  console.error("Missing auto stories for web pages:");
  for (const rel of missing) console.error(`  - ${rel}`);
  process.exit(1);
}

console.log(`Storybook auto page stories cover ${pages.length} web pages.`);
