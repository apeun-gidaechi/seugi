export const designTokens = Object.freeze({
  color: {
    ink: "#17253B",
    muted: "#728096",
    subtle: "#A5AFBD",
    canvas: "#F5F8FC",
    surface: "#FFFFFF",
    line: "#E3EAF2",
    primary: "#2479E8",
    primaryHover: "#1769D2",
    primarySoft: "#EAF3FF",
    accent: "#21B6A8",
    danger: "#D94A58",
    focus: "rgba(36, 121, 232, 0.18)",
  },
  space: { xs: "4px", sm: "8px", md: "12px", lg: "16px", xl: "24px", "2xl": "32px", "3xl": "48px" },
  radius: { sm: "8px", md: "12px", lg: "18px", xl: "24px", pill: "999px" },
  shadow: { card: "0 24px 64px rgba(28, 55, 92, 0.12)", soft: "0 8px 24px rgba(28, 55, 92, 0.08)" },
  type: { family: 'Pretendard, "Apple SD Gothic Neo", sans-serif', body: "15px", small: "13px" },
  breakpoint: { mobile: "720px" },
});

export type DesignTokens = typeof designTokens;
