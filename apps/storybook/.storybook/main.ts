import type { StorybookConfig } from "@storybook/react-vite";
import { mergeConfig } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const storybookDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(storybookDir, "../../..");
const webSrc = path.resolve(repoRoot, "apps/web/src");
const config: StorybookConfig = {
  stories: ["../stories/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-essentials"],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  async viteFinal(config) {
    return mergeConfig(config, {
      envDir: repoRoot,
      resolve: {
        alias: {
          "@": webSrc,
          "@/components": path.join(webSrc, "Components"),
        },
        extensions: [".web.tsx", ".web.ts", ".tsx", ".ts", ".jsx", ".js"],
      },
      optimizeDeps: {
        include: ["styled-components"],
      },
      assetsInclude: ["**/*.svg"],
    });
  },
};

export default config;
