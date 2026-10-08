import type { Meta, StoryObj } from "@storybook/react";
import { SeugiColor } from "@seugi/design-tokens";

function MobilePlaygroundNote() {
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", padding: 24, maxWidth: 560, lineHeight: 1.6 }}>
      <h1 style={{ color: SeugiColor.Gray800 }}>Mobile (React Native)</h1>
      <p style={{ color: SeugiColor.Gray600 }}>
        Native <code>design-system</code> and <code>screens</code> run in the{" "}
        <strong>Seugi Playground</strong> dev client (react-native-svg, Expo modules, device APIs).
      </p>
      <pre style={{ background: SeugiColor.Gray100, padding: 16, borderRadius: 8 }}>
        {`pnpm --filter @seugi/mobile start:playground`}
      </pre>
      <p style={{ color: SeugiColor.Gray600 }}>
        Web Storybook covers <strong>apps/web/Components</strong> (auto-generated sidebar entries) and
        shared tokens.
      </p>
    </div>
  );
}

const meta = {
  title: "Mobile/Playground",
  component: MobilePlaygroundNote,
} satisfies Meta<typeof MobilePlaygroundNote>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Readme: Story = {};
