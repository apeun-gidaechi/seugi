#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dsDir = path.join(root, "src/design-system");
const demosPath = path.join(root, "src/playground/designSystemDemos.tsx");
const catalogPath = path.join(root, "src/playground/DesignSystemCatalogScreen.tsx");
const demosSource = fs.readFileSync(demosPath, "utf8");
const catalogSource = fs.readFileSync(catalogPath, "utf8");

const modules = fs
  .readdirSync(dsDir)
  .filter((name) => name.endsWith(".tsx"))
  .map((name) => name.replace(/\.tsx$/, ""));

const missingDemos = modules.filter((name) => !demosSource.includes(`design-system/${name}`));
const missingCatalog = modules.filter((name) => !catalogSource.includes(`design-system/${name}`));

if (missingDemos.length > 0) {
  console.error("designSystemDemos.tsx missing imports for:");
  for (const name of missingDemos) console.error(`  - ${name}`);
  process.exit(1);
}

if (missingCatalog.length > 0) {
  console.error("DesignSystemCatalogScreen missing imports for:");
  for (const name of missingCatalog) console.error(`  - ${name}`);
  process.exit(1);
}

console.log(`Design system: ${modules.length} modules in demos + full catalog.`);
