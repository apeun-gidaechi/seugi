#!/usr/bin/env node
/**
 * Generates one CSF story per web Pages tsx file with a default export.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webSrc = path.resolve(__dirname, "../../web/src");
const pagesRoot = path.join(webSrc, "Pages");
const storybookAppRoot = path.resolve(__dirname, "..");
const outDir = path.resolve(storybookAppRoot, "stories/web/auto-pages");

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
  return SKIP_PARTS.some((part) => base.includes(part));
}

function storySlug(relativeToPages) {
  return relativeToPages
    .replace(/\.tsx$/, "")
    .split(path.sep)
    .join("/");
}

function importPathFromStory(storyFilePath, pageFilePath) {
  let rel = path.relative(path.dirname(storyFilePath), pageFilePath).split(path.sep).join("/");
  if (!rel.startsWith(".")) rel = `./${rel}`;
  return rel.replace(/\.tsx$/, "");
}

function storyFileName(slug) {
  return slug.replace(/\//g, "__") + ".stories.tsx";
}

const header = `/* auto-generated — pnpm --filter @seugi/storybook sync-stories */
// @ts-nocheck
import type { Meta, StoryObj } from "@storybook/react";
import { MemoryRouter } from "react-router-dom";
import { withDefaultStoryProps } from "../storybookComponentMocks";

`;

fs.mkdirSync(outDir, { recursive: true });
for (const existing of fs.readdirSync(outDir)) {
  if (existing.endsWith(".stories.tsx")) fs.unlinkSync(path.join(outDir, existing));
}

function hasDefaultExport(filePath) {
  const source = fs.readFileSync(filePath, "utf8");
  return /export\s+default\s/.test(source);
}

const files = walk(pagesRoot).filter((file) => !shouldSkip(file) && hasDefaultExport(file));
let written = 0;

for (const file of files) {
  const rel = path.relative(pagesRoot, file);
  const slug = storySlug(rel);
  const outName = storyFileName(slug);
  const storyFilePath = path.join(outDir, outName);
  const importPath = importPathFromStory(storyFilePath, file);
  const title = `Web/Pages/${slug}`;
  const body = `${header}
import Page from "${importPath}";

const meta = {
  title: "${title}",
  component: Page,
  decorators: [
    (Story) => (
      <MemoryRouter>
        <div style={{ minHeight: "100vh", background: "#f5f6f8" }}>
          <Story />
        </div>
      </MemoryRouter>
    ),
  ],
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof Page>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => <Page {...withDefaultStoryProps("${slug}", args)} />,
};
`;
  fs.writeFileSync(path.join(outDir, outName), body);
  written += 1;
}

console.log(`Wrote ${written} web page stories to ${outDir}`);
