#!/usr/bin/env node
/**
 * Verifies Storybook static build produced a story index matching on-disk CSF files.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const storybookRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const storiesRoot = path.join(storybookRoot, "stories");
const indexPath = path.join(storybookRoot, "storybook-static", "index.json");

function walkStories(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walkStories(full));
    else if (entry.name.endsWith(".stories.tsx") || entry.name.endsWith(".stories.ts"))
      files.push(full);
  }
  return files;
}

if (!fs.existsSync(indexPath)) {
  console.error("Missing storybook-static/index.json — run pnpm build in @seugi/storybook first.");
  process.exit(1);
}

const storyFiles = walkStories(storiesRoot);
const index = JSON.parse(fs.readFileSync(indexPath, "utf8"));
const entryCount = Object.keys(index.entries ?? {}).length;

if (entryCount < storyFiles.length) {
  console.error(
    `Storybook index has ${entryCount} entries but ${storyFiles.length} story files were found.`,
  );
  process.exit(1);
}

console.log(`Storybook index lists ${entryCount} entries (${storyFiles.length} CSF files on disk).`);
