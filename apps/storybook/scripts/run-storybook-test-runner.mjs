#!/usr/bin/env node
/**
 * Serves storybook-static and runs @storybook/test-runner (Playwright) against every story.
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const storybookRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = 6007;
const baseUrl = `http://127.0.0.1:${port}`;

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: storybookRoot,
      stdio: "inherit",
      shell: process.platform === "win32",
      ...options,
    });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with ${code}`));
    });
  });
}

const server = spawn(
  "pnpm",
  ["exec", "http-server", "storybook-static", "-p", String(port), "-c-1", "--silent"],
  { cwd: storybookRoot, stdio: "ignore" },
);

const shutdown = () => {
  server.kill("SIGTERM");
};

process.on("SIGINT", () => {
  shutdown();
  process.exit(130);
});

try {
  await run("pnpm", ["exec", "playwright", "install", "chromium"]);
  await new Promise((resolve) => setTimeout(resolve, 1500));
  await run("pnpm", ["exec", "wait-on", `${baseUrl}/index.json`, "-t", "60000"]);
  await run("pnpm", ["exec", "test-storybook", "--url", baseUrl, "--maxWorkers", "4"]);
} finally {
  shutdown();
}
