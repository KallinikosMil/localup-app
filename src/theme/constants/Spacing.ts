// 4-pt scale (UI redesign spec §2.2).
//
// The SPACING_PADDING_* aliases that used to sit below are gone. Five of
// them were exact duplicates of the short keys, so removing them changed
// nothing on screen. The sixth, SPACING_PADDING_60, was the one worth
// checking: it was 60 while the spec called for 48, kept wide so the
// original migration would be visually invisible. It had exactly one
// call site left, on a dev-only screen, so it takes the spec's 48 now.
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;
