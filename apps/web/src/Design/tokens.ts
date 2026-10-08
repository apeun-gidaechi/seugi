import { SeugiColor, SeugiFont } from "@seugi/design-tokens";

export const designTokens = Object.freeze({
  color: {
    ink: SeugiColor.Black,
    muted: SeugiColor.Gray600,
    subtle: SeugiColor.Gray500,
    canvas: SeugiColor.Primary050,
    surface: SeugiColor.White,
    line: SeugiColor.Gray300,
    primary: SeugiColor.Primary500,
    primaryHover: SeugiColor.Primary600,
    primarySoft: SeugiColor.Primary100,
    accent: SeugiColor.Orange500,
    danger: SeugiColor.Red500,
    focus: "rgba(29, 147, 243, 0.18)",
  },
  space: { xs: "4px", sm: "8px", md: "12px", lg: "16px", xl: "24px", "2xl": "32px", "3xl": "48px" },
  radius: { sm: "4px", md: "12px", lg: "16px", xl: "36px", pill: "99px" },
  shadow: { card: "0 4px 12px rgba(0, 0, 0, 0.06)", soft: "0 3px 9px rgba(0, 0, 0, 0.04)" },
  type: {
    family: "Pretendard",
    body: SeugiFont.body.body2.fontSize,
    small: SeugiFont.caption.caption2.fontSize,
  },
  breakpoint: { mobile: "768px" },
});

export type DesignTokens = typeof designTokens;
