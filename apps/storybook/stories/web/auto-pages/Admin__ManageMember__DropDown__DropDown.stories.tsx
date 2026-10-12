/* auto-generated — pnpm --filter @seugi/storybook sync-stories */
// @ts-nocheck
import type { Meta, StoryObj } from "@storybook/react";
import { withDefaultStoryProps } from "../storybookComponentMocks";

import Page from "../../../../web/src/Pages/Admin/ManageMember/DropDown/DropDown";

const meta = {
  title: "Web/Pages/Admin/ManageMember/DropDown/DropDown",
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
    router: { initialEntries: ["/"] },
  },
} satisfies Meta<typeof Page>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <Page {...withDefaultStoryProps("Admin/ManageMember/DropDown/DropDown", args)} />
  ),
};
