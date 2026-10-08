#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dsDir = path.join(root, "src/design-system");
const catalogPath = path.join(root, "src/playground/DesignSystemCatalogScreen.tsx");
const catalogSource = fs.readFileSync(catalogPath, "utf8");

const modules = fs
  .readdirSync(dsDir)
  .filter((name) => name.endsWith(".tsx"))
  .map((name) => name.replace(/\.tsx$/, ""));

const missing = modules.filter((name) => !catalogSource.includes(`design-system/${name}`));

if (missing.length > 0) {
  console.error("DesignSystemCatalogScreen missing imports for:");
  for (const name of missing) console.error(`  - ${name}`);
  process.exit(1);
}

console.log(`Design system catalog references ${modules.length} modules.`);
