export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export const typography = {
  title: { fontSize: 28, fontWeight: '700' as const, letterSpacing: -0.5 },
  heading: { fontSize: 20, fontWeight: '700' as const, letterSpacing: -0.3 },
  body: { fontSize: 16, fontWeight: '400' as const },
  label: { fontSize: 14, fontWeight: '600' as const },
  caption: { fontSize: 13, fontWeight: '400' as const },
} as const;

export type Spacing = typeof spacing;
export type Radius = typeof radius;
export type Typography = typeof typography;
