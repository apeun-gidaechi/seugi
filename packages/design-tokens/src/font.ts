const fontStyle = { fontFamily: "Pretendard", fontStyle: "normal", lineHeight: "130%" } as const;

const font = (fontSize: string, fontWeight: number) => ({ ...fontStyle, fontSize, fontWeight });

/** Shared typography scale used by the original Seugi clients. */
export const SeugiFont = Object.freeze({
  display: {
    display1: font("36px", 700),
    display2: font("32px", 700),
  },
  title: {
    title1: font("28px", 700),
    title2: font("24px", 700),
  },
  subtitle: {
    subtitle1: font("20px", 600),
    subtitle2: font("16px", 600),
  },
  body: {
    body1: font("14px", 600),
    body2: font("14px", 400),
  },
  caption: {
    caption1: font("12px", 600),
    caption2: font("12px", 400),
  },
});
