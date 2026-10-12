/* auto-generated — pnpm --filter @seugi/storybook sync-stories */
// @ts-nocheck
import type { Meta, StoryObj } from "@storybook/react";
import { withDefaultStoryProps } from "../storybookComponentMocks";

import Component from "../../../../web/src/Components/common/Navbar/Navbar";

const meta = {
  title: "Web/Components/common/Navbar/Navbar",
  component: Component,
  decorators: [
    (Story) => (
      <div style={{ padding: 16, maxWidth: 960 }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    layout: "fullscreen",
    router: { initialEntries: [{ pathname: "/chat" }] },
  },
} satisfies Meta<typeof Component>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => <Component {...withDefaultStoryProps("common/Navbar/Navbar", args)} />,
};
