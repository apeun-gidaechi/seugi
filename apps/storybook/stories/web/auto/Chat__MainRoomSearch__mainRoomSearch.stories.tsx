/* auto-generated — pnpm --filter @seugi/storybook sync-stories */
// @ts-nocheck
import type { Meta, StoryObj } from "@storybook/react";
import { MemoryRouter } from "react-router-dom";
import { withDefaultStoryProps } from "../storybookComponentMocks";

import Component from "../../../../web/src/Components/Chat/MainRoomSearch/mainRoomSearch";

const meta = {
  title: "Web/Components/Chat/MainRoomSearch/mainRoomSearch",
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
  render: (args) => (
    <Component {...withDefaultStoryProps("Chat/MainRoomSearch/mainRoomSearch", args)} />
  ),
};
