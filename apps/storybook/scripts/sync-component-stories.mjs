#!/usr/bin/env node
/**
 * Generates one CSF story per web Components tsx file (except router/shell/styles).
 * Re-run after adding web components: pnpm --filter @seugi/storybook sync-stories
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webSrc = path.resolve(__dirname, "../../web/src");
const componentsRoot = path.join(webSrc, "Components");
const storybookAppRoot = path.resolve(__dirname, "..");
const outDir = path.resolve(storybookAppRoot, "stories/web/auto");

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

function storySlug(relativeToComponents) {
  return relativeToComponents
    .replace(/\.tsx$/, "")
    .split(path.sep)
    .join("/");
}

/** Relative imports avoid Vite `@` alias mismatches when opening stories outside Storybook. */
function importPathFromStory(storyFilePath, componentFilePath) {
  let rel = path.relative(path.dirname(storyFilePath), componentFilePath).split(path.sep).join("/");
  if (!rel.startsWith(".")) rel = `./${rel}`;
  return rel.replace(/\.tsx$/, "");
}

function storyFileName(slug) {
  return slug.replace(/\//g, "__") + ".stories.tsx";
}

const DEFAULT_ARGS_BY_SLUG = {
  "Alert/Alert": { position: "top-right", subtext: "Storybook demo", titletext: "Alert" },
};

const header = `/* auto-generated — pnpm --filter @seugi/storybook sync-stories */
// @ts-nocheck
import type { Meta, StoryObj } from "@storybook/react";
import { MemoryRouter } from "react-router-dom";

`;

fs.mkdirSync(outDir, { recursive: true });
for (const existing of fs.readdirSync(outDir)) {
  if (existing.endsWith(".stories.tsx")) fs.unlinkSync(path.join(outDir, existing));
}

function hasDefaultExport(filePath) {
  const source = fs.readFileSync(filePath, "utf8");
  return /export\s+default\s/.test(source);
}

const files = walk(componentsRoot).filter((file) => !shouldSkip(file) && hasDefaultExport(file));
let written = 0;

for (const file of files) {
  const rel = path.relative(componentsRoot, file);
  const slug = storySlug(rel);
  const outName = storyFileName(slug);
  const storyFilePath = path.join(outDir, outName);
  const importPath = importPathFromStory(storyFilePath, file);
  const title = `Web/Components/${slug}`;
  const body = `${header}
import Component from "${importPath}";

const meta = {
  title: "${title}",
  component: Component,
  decorators: [
    (Story) => (
      <MemoryRouter>
        <div style={{ padding: 16, maxWidth: 960 }}>
          <Story />
        </div>
      </MemoryRouter>
    ),
  ],
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof Component>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => <Component {...args} />,
  args: ${JSON.stringify(DEFAULT_ARGS_BY_SLUG[slug] ?? {})},
};
`;
  fs.writeFileSync(path.join(outDir, outName), body);
  written += 1;
}

console.log(`Wrote ${written} web component stories to ${outDir}`);
