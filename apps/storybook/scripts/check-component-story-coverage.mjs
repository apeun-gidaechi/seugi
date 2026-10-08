#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const componentsRoot = path.resolve(__dirname, "../../web/src/Components");
const autoDir = path.resolve(__dirname, "../stories/web/auto");

const SKIP_FILES = new Set(["router.tsx", "Shell.tsx"]);
const SKIP_PARTS = [".style."];

function walk(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else if (entry.name.endsWith(".tsx")) files.push(full);
  }
  return files;
}

function shouldSkip(filePath) {
  const base = path.basename(filePath);
  if (SKIP_FILES.has(base)) return true;
  if (base === "index.tsx" && filePath.includes(`${path.sep}ui${path.sep}`)) return true;
  return SKIP_PARTS.some((part) => base.includes(part));
}

function hasDefaultExport(filePath) {
  const source = fs.readFileSync(filePath, "utf8");
  return /export\s+default\s/.test(source);
}

function storyFileName(slug) {
  return slug.replace(/\//g, "__") + ".stories.tsx";
}

const components = walk(componentsRoot).filter((f) => !shouldSkip(f) && hasDefaultExport(f));
const stories = new Set(fs.readdirSync(autoDir).filter((name) => name.endsWith(".stories.tsx")));

const missing = [];
for (const file of components) {
  const rel = path.relative(componentsRoot, file);
  const slug = rel
    .replace(/\.tsx$/, "")
    .split(path.sep)
    .join("/");
  const expected = storyFileName(slug);
  if (!stories.has(expected)) missing.push(rel);
}

if (missing.length > 0) {
  console.error("Missing auto stories for web components:");
  for (const rel of missing) console.error(`  - ${rel}`);
  process.exit(1);
}

console.log(`Storybook auto stories cover ${components.length} web components.`);
