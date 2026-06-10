// ─────────────────────────────────────────────────────────
// themeColors — bmbcore-style convention (spec §2.3a, user
// decision 2026-06-10, FINAL).
//
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
  WHITE: "#FFFFFF",
  GREY_050: "#FDFCFE",
  GREY_100: "#E6E0F6",
  GREY_400: "#79747E",
  GREY_600: "#49454F",
  GREY_900: "#1E1A1F",

  VIOLET_050: "#F3E8FF",
  VIOLET_100: "#EDE7FE",
  VIOLET_300: "#A78BFA",
  VIOLET_350: "#A78BFA",
  VIOLET_450: "#653FD4",
  VIOLET_500: "#653FD4",
  VIOLET_850: "#3E056E",
  VIOLET_900: "#2E1A72",
  VIOLET_950: "#381E72",
  VIOLET_990: "#2E1A72",

  GREEN_500: "#00C853",
  GREEN_700: "#228B60",
  RED_500: "#EF4444",
  RED_700: "#B3261E",
  RED_900: "#601410",
  AMBER_500: "#F59E0B",
  BLUE_500: "#3B82F6",

  // on-photo / overlay — mode-constant
  ON_PHOTO: "#FFFFFF",
  WHITE_A85: "rgba(255,255,255,0.85)",
  WHITE_A20: "rgba(255,255,255,0.2)",
  WHITE_A10: "rgba(255,255,255,0.1)",
  BLACK_A75: "rgba(0,0,0,0.75)",
  BLACK_A35: "rgba(0,0,0,0.35)",
  BLACK_A10: "rgba(0,0,0,0.1)",
};

const darkBase: typeof lightBase = {
  WHITE: "#27252B",
  GREY_050: "#1C1B1F",
  GREY_100: "#49454F",
  GREY_400: "#938F99",
  GREY_600: "#CAC4D0",
  GREY_900: "#E6E1E5",

  VIOLET_050: "#4F378B",
  VIOLET_100: "#4F378B",
  VIOLET_300: "#CCC2FF",
  VIOLET_350: "#B79CFF",
  VIOLET_450: "#7C5CE0",
  VIOLET_500: "#D0BCFF",
  VIOLET_850: "#EADDFF",
  VIOLET_900: "#EADDFF",
  VIOLET_950: "#381E72",
  VIOLET_990: "#2E1A72",

  GREEN_500: "#00E676",
  GREEN_700: "#34D399",
  RED_500: "#F87171",
  RED_700: "#F2B8B5",
  RED_900: "#601410",
  AMBER_500: "#FFD740",
  BLUE_500: "#8AB4F8",

  // on-photo / overlay — mode-constant
  ON_PHOTO: "#FFFFFF",
  WHITE_A85: "rgba(255,255,255,0.85)",
  WHITE_A20: "rgba(255,255,255,0.2)",
  WHITE_A10: "rgba(255,255,255,0.1)",
  BLACK_A75: "rgba(0,0,0,0.75)",
  BLACK_A35: "rgba(0,0,0,0.35)",
  BLACK_A10: "rgba(0,0,0,0.1)",
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
  gradientStart: lightBase.VIOLET_450,
  gradientEnd: lightBase.VIOLET_350,
  surfaceElevated: lightBase.WHITE,
  imageInset: lightBase.BLACK_A10,
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
  gradientStart: darkBase.VIOLET_450,
  gradientEnd: darkBase.VIOLET_350,
  surfaceElevated: darkBase.WHITE,
  imageInset: darkBase.WHITE_A10,
};
