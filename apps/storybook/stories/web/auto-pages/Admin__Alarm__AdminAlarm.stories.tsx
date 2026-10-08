/* auto-generated — pnpm --filter @seugi/storybook sync-stories */
// @ts-nocheck
import type { Meta, StoryObj } from "@storybook/react";
import { MemoryRouter } from "react-router-dom";
import { withDefaultStoryProps } from "../storybookComponentMocks";

import Page from "../../../../web/src/Pages/Admin/Alarm/AdminAlarm";

const meta = {
  title: "Web/Pages/Admin/Alarm/AdminAlarm",
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
  render: (args) => <Page {...withDefaultStoryProps("Admin/Alarm/AdminAlarm", args)} />,
};
