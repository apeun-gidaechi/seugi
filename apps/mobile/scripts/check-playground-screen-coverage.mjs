#!/usr/bin/env node
/**
 * Ensures every *Screen.tsx under src/screens is referenced in playground screenDemos.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const screensRoot = path.join(root, "src/screens");
const demosPath = path.join(root, "src/playground/screenDemos.tsx");
const demosSource = fs.readFileSync(demosPath, "utf8");

/** Screens covered only via composite demos (not imported by symbol name). */
const COVERED_ALIASES = new Map([["shell/ChatRoomMessages.tsx", "ChatRoomMessages"]]);

function walkScreens(dir, relative = "") {
  const entries = [];
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = relative ? `${relative}/${name.name}` : name.name;
    if (name.isDirectory()) entries.push(...walkScreens(path.join(dir, name.name), rel));
    else if (name.name.endsWith("Screen.tsx") || rel === "shell/ChatRoomMessages.tsx")
      entries.push(rel);
  }
  return entries;
}

const screenFiles = walkScreens(screensRoot);
const missing = [];

for (const rel of screenFiles) {
  const base = path.basename(rel, ".tsx");
  const alias = COVERED_ALIASES.get(rel);
  const covered = demosSource.includes(base) || (alias && demosSource.includes(alias));
  if (!covered) missing.push(rel);
}

if (missing.length > 0) {
  console.error("Playground screenDemos missing coverage for:");
  for (const file of missing) console.error(`  - src/screens/${file}`);
  process.exit(1);
}

console.log(`Playground covers ${screenFiles.length} screen modules.`);
