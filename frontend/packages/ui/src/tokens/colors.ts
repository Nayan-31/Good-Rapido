export const colors = {
  mint: "#63EBD5",
  deepTeal: "#008C7A",
  darkNavy: "#071F35",
  inkText: "#071A2F",
  softBackground: "#F4F7FA",
  cardWhite: "#FFFFFF",
  mutedText: "#667085",
  success: "#00A86B",
  warning: "#F59E0B",
  danger: "#D92D20",
  info: "#2563EB",
  softMintSurface: "#E9FFFA",
  softRedSurface: "#FFF0EF",
  softGraySurface: "#F1F3F6"
} as const;

export type ColorToken = keyof typeof colors;
