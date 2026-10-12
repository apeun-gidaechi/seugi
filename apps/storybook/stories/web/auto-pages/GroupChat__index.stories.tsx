/* auto-generated — pnpm --filter @seugi/storybook sync-stories */
// @ts-nocheck
import type { Meta, StoryObj } from "@storybook/react";
import { withDefaultStoryProps } from "../storybookComponentMocks";

import Page from "../../../../web/src/Pages/GroupChat/index";

const meta = {
  title: "Web/Pages/GroupChat/index",
  component: Page,
  decorators: [
    (Story) => (
      <div style={{ minHeight: "100vh", background: "#f5f6f8" }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    layout: "fullscreen",
    router: { initialEntries: ["/groupchat"] },
  },
} satisfies Meta<typeof Page>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => <Page {...withDefaultStoryProps("GroupChat/index", args)} />,
};
