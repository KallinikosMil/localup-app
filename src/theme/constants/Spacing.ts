// 4-pt scale (UI redesign spec §2.2). The SPACING_PADDING_*
// keys are deprecated aliases — migrate call sites to the
// short keys per UI PR, then delete them.
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
  // deprecated aliases — remove after migration
  SPACING_PADDING_8: 8,
  SPACING_PADDING_12: 12,
  SPACING_PADDING_16: 16,
  SPACING_PADDING_24: 24,
  SPACING_PADDING_32: 32,
  // Spec maps this alias to 48; kept at 60 for now so
  // PR-UI-0 stays visually invisible — the 60→48 change
  // lands with the screen PRs that own those layouts.
  SPACING_PADDING_60: 60,
};
