import type { StorybookConfig } from "@storybook/react-vite";
import { createRequire } from "module";
import { mergeConfig } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const storybookDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(storybookDir, "../../..");
const webSrc = path.resolve(repoRoot, "apps/web/src");
const webAppRoot = path.resolve(repoRoot, "apps/web");
const require = createRequire(import.meta.url);
const reactRouterDomRoot = path.dirname(
  require.resolve("react-router-dom/package.json", { paths: [webAppRoot] }),
);
const reactRouterRoot = path.dirname(
  require.resolve("react-router/package.json", { paths: [reactRouterDomRoot] }),
);
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
        dedupe: ["react", "react-dom", "react-router", "react-router-dom"],
        alias: {
          "@": webSrc,
          "@/components": path.join(webSrc, "Components"),
          "react-router-dom": reactRouterDomRoot,
          "react-router": reactRouterRoot,
          "@/Hooks/Common/SendMessage/socketService": path.join(
            storybookDir,
            "storybookSocketService.ts",
          ),
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
