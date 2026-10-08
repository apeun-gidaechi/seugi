#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const componentsDir = path.join(root, "src/components");
const demosPath = path.join(root, "src/playground/componentDemos.tsx");
const demosSource = fs.readFileSync(demosPath, "utf8");

/** Imported via ui.tsx barrel rather than by file name. */
const COVERED_VIA_UI = new Set(["ui.tsx"]);

const files = fs.readdirSync(componentsDir).filter((name) => name.endsWith(".tsx"));
const missing = [];

for (const file of files) {
  if (COVERED_VIA_UI.has(file)) {
    if (!demosSource.includes("ui-primitives") && !demosSource.includes('from "../components/ui"'))
      missing.push(`${file} (expected ui-primitives demo)`);
    continue;
  }
  const base = file.replace(/\.tsx$/, "");
  if (!demosSource.includes(base)) missing.push(file);
}

if (missing.length > 0) {
  console.error("componentDemos missing coverage for:");
  for (const file of missing) console.error(`  - src/components/${file}`);
  process.exit(1);
}

console.log(`Playground componentDemos covers ${files.length} component modules.`);
