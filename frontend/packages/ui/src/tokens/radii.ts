export const radii = {
  control: "8px",
  card: "12px",
  bottomSheet: "24px",
  pill: "999px"
} as const;

export type RadiusToken = keyof typeof radii;
