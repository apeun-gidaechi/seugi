import type { TestRunnerConfig } from "@storybook/test-runner";

const config: TestRunnerConfig = {
  async postVisit(page) {
    await page.locator("#storybook-root").waitFor({ state: "attached", timeout: 20_000 });
  },
};

export default config;
