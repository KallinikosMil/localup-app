// themeColors
// EVERY hex in the app lives in THIS file and only here.
// `lightBase`/`darkBase` carry IDENTICAL literal keys; the
// same key resolves to a different value per mode — the key
// means "this position in the UI hierarchy", the mode decides
// the RGB (dark.WHITE is intentionally not white — that's the
// convention, not a bug). Alpha overlay keys (ON_PHOTO,
// *_A*) are mode-constant because they sit on photos/scrims,
// never on themed surfaces.
//
// MD3 keys (primary, onSurface, …) are DERIVED from the base
// — react-native-paper needs them for its own components; no
// handwritten hex in the mapping.
//
// Consumption: components use useAppTheme() →
// theme.colors.GREY_100 / theme.colors.primary. NEVER import
// these objects directly, never inline hex in components.
// ─────────────────────────────────────────────────────────

const lightBase = {
  WHITE: '#FFFFFF',
  GREY_050: '#FDFCFE',
  GREY_100: '#E6E0F6',
  // A genuinely neutral light grey, for hairlines and bubble edges.
  // GREY_100 above is #E6E0F6 — saturated enough to read as violet, so a
  // border drawn in it competes with the accent instead of receding. This
  // one keeps only a trace of the same hue, enough to belong to the
  // palette and not enough to be seen as a colour.
  GREY_200: '#E8E6EC',
  // Empty photo slots are drawn with a dashed border, which needs to be
  // visibly heavier than a hairline (GREY_200) and lighter than body text
  // — a dashed line at hairline weight just looks like a rendering fault.
  GREY_300: '#D3CFDA',
  // Field hints, counters and placeholder copy: quieter than
  // onSurfaceVariant, still above the WCAG floor on both grounds.
  GREY_350: '#8F8B96',
  GREY_400: '#79747E',
  GREY_600: '#49454F',
  GREY_900: '#1E1A1F',

  VIOLET_025: '#F5EFFF',
  VIOLET_050: '#F3E8FF',
  VIOLET_100: '#EDE7FE',
  VIOLET_200: '#CDBAF7',
  VIOLET_300: '#A78BFA',
  VIOLET_350: '#A78BFA',
  VIOLET_450: '#653FD4',
  VIOLET_500: '#653FD4',
  VIOLET_850: '#3E056E',
  VIOLET_900: '#2E1A72',
  VIOLET_950: '#381E72',
  VIOLET_990: '#2E1A72',

  GREEN_500: '#00C853',
  GREEN_700: '#228B60',
  // Mode-constant green, for the LOCAL pill when it sits on a photo. The
  // themed GREEN_700 flips to a mint in dark, which a photo does not.
  GREEN_ON_PHOTO: '#228B60',
  RED_050: '#FDECEA',
  RED_200: '#F3C9C6',
  RED_500: '#EF4444',
  RED_700: '#B3261E',
  RED_900: '#601410',
  AMBER_500: '#F59E0B',
  BLUE_500: '#3B82F6',

  // on-photo / overlay — mode-constant
  ON_PHOTO: '#FFFFFF',
  // The brand gradient, 140°. Mode-CONSTANT on purpose: it is the one
  // surface where violet is the paint rather than the light, so it has to
  // read as the same brand mark in both themes. It used to resolve
  // through VIOLET_450/350, which meant dark mode quietly ran a
  // different, paler gradient than light.
  GRADIENT_FROM: '#A78BFA',
  GRADIENT_TO: '#653FD4',
  // Hero scrims. Not black — a near-black violet, so the fade lands on
  // the dark ground instead of greying the photo out on the way down.
  SCRIM_00: 'rgba(14,12,20,0)',
  SCRIM_45: 'rgba(14,12,20,0.45)',
  SCRIM_82: 'rgba(14,12,20,0.82)',
  // Chips, pills and bars drawn ON a photo. Mode-VARYING despite sitting
  // on an image: the light hero runs a lighter scrim, so the frosting has
  // to be denser to keep the same weight against it.
  CHIP_PHOTO_BG: 'rgba(255,255,255,0.18)',
  CHIP_PHOTO_BORDER: 'rgba(255,255,255,0.28)',
  // A shared interest is the reason these two people are being shown to
  // each other, so it is the one chip that gets a solid fill.
  CHIP_SHARED_BG: '#FFFFFF',
  CHIP_SHARED_BORDER: '#FFFFFF',
  PROGRESS_IDLE: 'rgba(255,255,255,0.35)',
  // The floating tab bar. Light gives it a solid card with a shadow;
  // dark frosts it so the photo keeps showing through.
  // Header pills and the pass button also sit on the photo. Light
  // makes them solid white cards with a cast shadow; dark frosts them,
  // because a solid white chip on a dark hero reads as a sticker.
  HEADER_PILL_BG: '#FFFFFF',
  HEADER_PILL_BORDER: 'transparent',
  PASS_BTN_BG: '#FFFFFF',
  PASS_BTN_BORDER: 'transparent',
  // The small tinted counters beside a section label — '2 NEW',
  // '3 UNREAD' — and the NEW MATCH chip on a row. Quieter than a solid
  // badge because they label a group rather than demand a tap.
  COUNT_PILL_BG: '#F3E8FF',
  COUNT_PILL_BORDER: '#D9C6F5',
  TAB_SURFACE: '#FFFFFF',
  TAB_BORDER: 'transparent',
  TAB_INACTIVE: '#79747E',
  WHITE_A85: 'rgba(255,255,255,0.85)',
  WHITE_A20: 'rgba(255,255,255,0.2)',
  WHITE_A10: 'rgba(255,255,255,0.1)',
  BLACK_A75: 'rgba(0,0,0,0.75)',
  BLACK_A35: 'rgba(0,0,0,0.35)',
  BLACK_A10: 'rgba(0,0,0,0.1)',
};

const darkBase: typeof lightBase = {
  WHITE: '#27252B',
  GREY_050: '#1C1B1F',
  GREY_100: '#49454F',
  // Dark-mode counterpart: a hairline has to sit just above the ground,
  // not halfway to the text, or it reads as a border instead of a seam.
  GREY_200: '#35323B',
  GREY_300: '#4A4552',
  GREY_350: '#79747E',
  GREY_400: '#938F99',
  GREY_600: '#CAC4D0',
  GREY_900: '#E6E1E5',

  VIOLET_025: '#2A2434',
  VIOLET_050: '#4F378B',
  VIOLET_100: '#4F378B',
  VIOLET_200: '#4A3A6B',
  VIOLET_300: '#CCC2FF',
  VIOLET_350: '#B79CFF',
  VIOLET_450: '#7C5CE0',
  VIOLET_500: '#D0BCFF',
  VIOLET_850: '#EADDFF',
  VIOLET_900: '#EADDFF',
  VIOLET_950: '#381E72',
  VIOLET_990: '#2E1A72',

  GREEN_500: '#00E676',
  GREEN_700: '#34D399',
  GREEN_ON_PHOTO: '#228B60',
  RED_050: '#2E1F1F',
  RED_200: '#5C3B39',
  RED_500: '#F87171',
  RED_700: '#F2B8B5',
  RED_900: '#601410',
  AMBER_500: '#FFD740',
  BLUE_500: '#8AB4F8',

  // on-photo / overlay — mode-constant
  ON_PHOTO: '#FFFFFF',
  GRADIENT_FROM: '#A78BFA',
  GRADIENT_TO: '#653FD4',
  SCRIM_00: 'rgba(14,12,20,0)',
  SCRIM_45: 'rgba(14,12,20,0.45)',
  SCRIM_82: 'rgba(14,12,20,0.82)',
  CHIP_PHOTO_BG: 'rgba(255,255,255,0.14)',
  CHIP_PHOTO_BORDER: 'rgba(255,255,255,0.2)',
  CHIP_SHARED_BG: 'rgba(208,188,255,0.26)',
  CHIP_SHARED_BORDER: 'rgba(208,188,255,0.55)',
  PROGRESS_IDLE: 'rgba(255,255,255,0.32)',
  HEADER_PILL_BG: 'rgba(255,255,255,0.16)',
  HEADER_PILL_BORDER: 'rgba(255,255,255,0.2)',
  PASS_BTN_BG: 'rgba(255,255,255,0.12)',
  PASS_BTN_BORDER: 'rgba(255,255,255,0.24)',
  COUNT_PILL_BG: 'rgba(208,188,255,0.18)',
  COUNT_PILL_BORDER: 'rgba(208,188,255,0.4)',
  TAB_SURFACE: 'rgba(255,255,255,0.13)',
  TAB_BORDER: 'rgba(255,255,255,0.18)',
  TAB_INACTIVE: 'rgba(255,255,255,0.75)',
  WHITE_A85: 'rgba(255,255,255,0.85)',
  WHITE_A20: 'rgba(255,255,255,0.2)',
  WHITE_A10: 'rgba(255,255,255,0.1)',
  BLACK_A75: 'rgba(0,0,0,0.75)',
  BLACK_A35: 'rgba(0,0,0,0.35)',
  BLACK_A10: 'rgba(0,0,0,0.1)',
};

export const lightColors = {
  ...lightBase,
  primary: lightBase.VIOLET_500,
  onPrimary: lightBase.WHITE,
  primaryContainer: lightBase.VIOLET_100,
  onPrimaryContainer: lightBase.VIOLET_900,

  secondary: lightBase.VIOLET_300,
  onSecondary: lightBase.WHITE,
  secondaryContainer: lightBase.VIOLET_050,
  onSecondaryContainer: lightBase.VIOLET_850,

  background: lightBase.GREY_050,
  onBackground: lightBase.GREY_900,

  surface: lightBase.WHITE,
  onSurface: lightBase.GREY_900,
  surfaceVariant: lightBase.GREY_100,
  onSurfaceVariant: lightBase.GREY_600,

  outline: lightBase.GREY_400,
  outlineVariant: lightBase.GREY_200,
  error: lightBase.RED_700,
  onError: lightBase.WHITE,

  success: lightBase.GREEN_500,
  warning: lightBase.AMBER_500,
  info: lightBase.BLUE_500,

  // UI redesign tokens (spec §2.3)
  modeLocal: lightBase.GREEN_700,
  modeTraveler: lightBase.VIOLET_500,
  like: lightBase.GREEN_500,
  pass: lightBase.RED_500,
  gradientStart: lightBase.GRADIENT_FROM,
  gradientEnd: lightBase.GRADIENT_TO,
  surfaceElevated: lightBase.WHITE,
  imageInset: lightBase.BLACK_A10,

  // Redesign §2. Semantic names live here, never in the base — the base
  // says what a colour IS, this layer says what it is FOR.
  surfaceSelected: lightBase.VIOLET_025,
  outlineSelected: lightBase.VIOLET_200,
  onSurfaceFaint: lightBase.GREY_350,
  outlineDashed: lightBase.GREY_300,
  // MD3 already owns these two names; Paper's own error surfaces pick
  // them up, which is the intent — one error colour, not two.
  errorContainer: lightBase.RED_050,
  errorOutline: lightBase.RED_200,

  // Foreground on the brand gradient. Mode-constant for the same
  // reason the gradient is: dark's onPrimary is #381E72, which on a
  // #653FD4 gradient is violet on violet. This is the ON_PHOTO rule —
  // the gradient is paint, so what sits on it is not themed.
  onGradient: lightBase.ON_PHOTO,

  // The hero's furniture. The mode pills go mode-constant here because
  // they sit on an image; the themed modeLocal/modeTraveler are for
  // surfaces, where flipping is correct.
  modeLocalOnPhoto: lightBase.GREEN_ON_PHOTO,
  modeTravelerOnPhoto: lightBase.GRADIENT_TO,
  chipOnPhoto: lightBase.CHIP_PHOTO_BG,
  chipOnPhotoBorder: lightBase.CHIP_PHOTO_BORDER,
  chipShared: lightBase.CHIP_SHARED_BG,
  chipSharedBorder: lightBase.CHIP_SHARED_BORDER,
  onChipShared: lightBase.VIOLET_850,
  progressIdle: lightBase.PROGRESS_IDLE,
  headerPill: lightBase.HEADER_PILL_BG,
  headerPillBorder: lightBase.HEADER_PILL_BORDER,
  onHeaderPill: lightBase.VIOLET_850,
  onHeaderPillIcon: lightBase.GRADIENT_TO,
  passButton: lightBase.PASS_BTN_BG,
  passButtonBorder: lightBase.PASS_BTN_BORDER,
  onPassButton: lightBase.RED_500,
  countPill: lightBase.COUNT_PILL_BG,
  countPillBorder: lightBase.COUNT_PILL_BORDER,
  tabBarSurface: lightBase.TAB_SURFACE,
  tabBarBorder: lightBase.TAB_BORDER,
  onTabInactive: lightBase.TAB_INACTIVE,

  // The active tab segment is the one place light is not a token swap:
  // light paints a violet gradient pill (white label), dark a solid
  // white pill (deep violet label). A white pill on a white surface is
  // invisible, so the SHAPE differs per mode and the component picks it
  // from resolvedMode — only the label colour is a token.
  onTabActive: lightBase.ON_PHOTO,
  tabActiveSurface: lightBase.ON_PHOTO,

  scrimTransparent: lightBase.SCRIM_00,
  scrimMid: lightBase.SCRIM_45,
  scrimStrong: lightBase.SCRIM_82,
};

export const darkColors: typeof lightColors = {
  ...darkBase,
  primary: darkBase.VIOLET_500,
  onPrimary: darkBase.VIOLET_950,
  primaryContainer: darkBase.VIOLET_100,
  onPrimaryContainer: darkBase.VIOLET_900,

  secondary: darkBase.VIOLET_300,
  onSecondary: darkBase.VIOLET_990,
  secondaryContainer: darkBase.VIOLET_050,
  onSecondaryContainer: darkBase.VIOLET_850,

  background: darkBase.GREY_050,
  onBackground: darkBase.GREY_900,

  surface: darkBase.GREY_050,
  onSurface: darkBase.GREY_900,
  surfaceVariant: darkBase.GREY_100,
  onSurfaceVariant: darkBase.GREY_600,

  outline: darkBase.GREY_400,
  outlineVariant: darkBase.GREY_200,
  error: darkBase.RED_700,
  onError: darkBase.RED_900,

  success: darkBase.GREEN_500,
  warning: darkBase.AMBER_500,
  info: darkBase.BLUE_500,

  // UI redesign tokens (spec §2.3)
  modeLocal: darkBase.GREEN_700,
  modeTraveler: darkBase.VIOLET_500,
  like: darkBase.GREEN_500,
  pass: darkBase.RED_500,
  gradientStart: darkBase.GRADIENT_FROM,
  gradientEnd: darkBase.GRADIENT_TO,
  surfaceElevated: darkBase.WHITE,
  imageInset: darkBase.WHITE_A10,

  surfaceSelected: darkBase.VIOLET_025,
  outlineSelected: darkBase.VIOLET_200,
  onSurfaceFaint: darkBase.GREY_350,
  outlineDashed: darkBase.GREY_300,
  errorContainer: darkBase.RED_050,
  errorOutline: darkBase.RED_200,

  onGradient: darkBase.ON_PHOTO,

  modeLocalOnPhoto: darkBase.GREEN_ON_PHOTO,
  modeTravelerOnPhoto: darkBase.GRADIENT_TO,
  chipOnPhoto: darkBase.CHIP_PHOTO_BG,
  chipOnPhotoBorder: darkBase.CHIP_PHOTO_BORDER,
  chipShared: darkBase.CHIP_SHARED_BG,
  chipSharedBorder: darkBase.CHIP_SHARED_BORDER,
  onChipShared: darkBase.ON_PHOTO,
  progressIdle: darkBase.PROGRESS_IDLE,
  headerPill: darkBase.HEADER_PILL_BG,
  headerPillBorder: darkBase.HEADER_PILL_BORDER,
  onHeaderPill: darkBase.ON_PHOTO,
  onHeaderPillIcon: darkBase.ON_PHOTO,
  passButton: darkBase.PASS_BTN_BG,
  passButtonBorder: darkBase.PASS_BTN_BORDER,
  onPassButton: darkBase.ON_PHOTO,
  countPill: darkBase.COUNT_PILL_BG,
  countPillBorder: darkBase.COUNT_PILL_BORDER,
  tabBarSurface: darkBase.TAB_SURFACE,
  tabBarBorder: darkBase.TAB_BORDER,
  onTabInactive: darkBase.TAB_INACTIVE,

  onTabActive: darkBase.VIOLET_990,
  tabActiveSurface: darkBase.ON_PHOTO,

  scrimTransparent: darkBase.SCRIM_00,
  scrimMid: darkBase.SCRIM_45,
  scrimStrong: darkBase.SCRIM_82,
};
