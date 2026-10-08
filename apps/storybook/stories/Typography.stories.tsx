import type { Meta, StoryObj } from "@storybook/react";
import { SeugiColor, SeugiFont } from "@seugi/design-tokens";

function TypographyScale() {
  const rows = [
    ...Object.entries(SeugiFont.display),
    ...Object.entries(SeugiFont.title),
    ...Object.entries(SeugiFont.subtitle),
    ...Object.entries(SeugiFont.body),
    ...Object.entries(SeugiFont.caption),
  ];
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", padding: 24 }}>
      <h1 style={{ color: SeugiColor.Gray800 }}>Typography (SeugiFont)</h1>
      <p style={{ color: SeugiColor.Gray600 }}>
        Shared token scale; mobile applies Pretendard via native styles.
      </p>
      <div style={{ display: "grid", gap: 16, marginTop: 24 }}>
        {rows.map(([name, style]) => (
          <div
            key={name}
            style={{ borderBottom: `1px solid ${SeugiColor.Gray200}`, paddingBottom: 12 }}
          >
            <div style={{ fontSize: 12, color: SeugiColor.Gray500, marginBottom: 4 }}>{name}</div>
            <div style={{ color: SeugiColor.Gray800, ...style }}>스기 디자인 시스템 123</div>
            <code style={{ fontSize: 11, color: SeugiColor.Gray600 }}>
              {style.fontSize} / {style.fontWeight}
            </code>
          </div>
        ))}
      </div>
    </div>
  );
}

const meta = {
  title: "Design system/Typography",
  component: TypographyScale,
} satisfies Meta<typeof TypographyScale>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Scale: Story = {};
