/* auto-generated — pnpm --filter @seugi/storybook sync-stories */
// @ts-nocheck
import type { Meta, StoryObj } from "@storybook/react";
import { withDefaultStoryProps } from "../storybookComponentMocks";


import Component from "../../../../web/src/Components/Onboarding/Signup/EmailSignup/emailsignup";

const meta = {
  title: "Web/Components/Onboarding/Signup/EmailSignup/emailsignup",
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
    router: { initialEntries: [{"pathname":"/emailsignup"}] },
  },
} satisfies Meta<typeof Component>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => <Component {...withDefaultStoryProps("Onboarding/Signup/EmailSignup/emailsignup", args)} />,
};
