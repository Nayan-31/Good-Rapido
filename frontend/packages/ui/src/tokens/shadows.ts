export const shadows = {
  card: "0 10px 30px rgba(7, 31, 53, 0.08)",
  heavyPanel: "0 16px 40px rgba(7, 31, 53, 0.16)",
  focusRing: "0 0 0 3px rgba(99, 235, 213, 0.35)"
} as const;

export type ShadowToken = keyof typeof shadows;
