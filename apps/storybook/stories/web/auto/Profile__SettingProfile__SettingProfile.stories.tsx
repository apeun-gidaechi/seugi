/* auto-generated — pnpm --filter @seugi/storybook sync-stories */
import type { Meta, StoryObj } from "@storybook/react";
import { MemoryRouter } from "react-router-dom";


import Component from "../../../../web/src/Components/Profile/SettingProfile/SettingProfile";

const meta = {
  title: "Web/Components/Profile/SettingProfile/SettingProfile",
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
  render: (args) => <Component {...args} />,
  args: {},
};
