import type { Meta, StoryObj } from "@storybook/react";
import { SeugiColor } from "@seugi/design-tokens";

const paletteGroups: Array<{ title: string; entries: Array<[string, string]> }> = [
  {
    title: "Gray",
    entries: Object.entries(SeugiColor).filter(([key]) => key.startsWith("Gray")),
  },
  {
    title: "Primary",
    entries: Object.entries(SeugiColor).filter(([key]) => key.startsWith("Primary")),
  },
  {
    title: "Semantic",
    entries: Object.entries(SeugiColor).filter(
      ([key]) =>
        key.startsWith("Red") ||
        key.startsWith("Orange") ||
        key.startsWith("Yellow") ||
        key === "White" ||
        key === "Black",
    ),
  },
];

function ColorPalette() {
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", padding: 24 }}>
      <h1 style={{ margin: "0 0 8px", color: SeugiColor.Gray800 }}>Seugi design tokens</h1>
      <p style={{ margin: "0 0 24px", color: SeugiColor.Gray600 }}>
        Native primitives: sidebar <strong>Mobile/Design system</strong> and device playground.
      </p>
      {paletteGroups.map((group) => (
        <section key={group.title} style={{ marginBottom: 32 }}>
          <h2 style={{ color: SeugiColor.Gray800 }}>{group.title}</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            {group.entries.map(([name, hex]) => (
              <div
                key={name}
                style={{
                  width: 120,
                  borderRadius: 8,
                  overflow: "hidden",
                  border: `1px solid ${SeugiColor.Gray300}`,
                  background: SeugiColor.White,
                }}
              >
                <div style={{ height: 56, background: hex }} />
                <div style={{ padding: 8, fontSize: 12 }}>
                  <div style={{ fontWeight: 600, color: SeugiColor.Gray800 }}>{name}</div>
                  <div style={{ color: SeugiColor.Gray600 }}>{hex}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

const meta = {
  title: "Design system/Tokens",
  component: ColorPalette,
} satisfies Meta<typeof ColorPalette>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Palette: Story = {};
