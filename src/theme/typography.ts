import { TextStyle } from 'react-native';

// UI redesign scale (spec 2026-06-10-ui-redesign §2.1):
// Plus Jakarta Sans for headlines, Inter for body. Fonts
// are loaded in AppProviders via useFonts — fontFamily here
// must match the loaded names exactly. fontWeight is NOT
// set alongside fontFamily: Android resolves weight from
// the font file itself, and a mismatched fontWeight makes
// it silently fall back to the system font.
export type TypographyVariant =
  | 'display'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'bodyLg'
  | 'body'
  | 'caption'
  | 'overline'
  // legacy variants — still used by pre-redesign screens;
  // migrate call sites per UI PR, then remove
  | 'title'
  | 'subtitle'
  | 'bodySmall'
  | 'label';

type PaperVariant =
  | 'displaySmall'
  | 'displayMedium'
  | 'headlineLarge'
  | 'headlineSmall'
  | 'titleLarge'
  | 'titleMedium'
  | 'bodyLarge'
  | 'bodyMedium'
  | 'bodySmall'
  | 'labelLarge'
  | 'labelSmall';

type TypographyDef = {
  paperVariant: PaperVariant;
  style: TextStyle;
};

export const Typography: Record<TypographyVariant, TypographyDef> = {
  display: {
    paperVariant: 'displayMedium',
    style: {
      fontFamily: 'PlusJakartaSans_800ExtraBold',
      fontSize: 32,
      lineHeight: 38,
    },
  },
  h1: {
    paperVariant: 'displaySmall',
    style: {
      fontFamily: 'PlusJakartaSans_700Bold',
      fontSize: 28,
      lineHeight: 34,
    },
  },
  h2: {
    paperVariant: 'headlineLarge',
    style: {
      fontFamily: 'PlusJakartaSans_700Bold',
      fontSize: 22,
      lineHeight: 28,
    },
  },
  h3: {
    paperVariant: 'headlineSmall',
    style: {
      fontFamily: 'PlusJakartaSans_600SemiBold',
      fontSize: 18,
      lineHeight: 24,
    },
  },
  bodyLg: {
    paperVariant: 'bodyLarge',
    style: {
      fontFamily: 'Inter_400Regular',
      fontSize: 16,
      lineHeight: 24,
    },
  },
  body: {
    paperVariant: 'bodyMedium',
    style: {
      fontFamily: 'Inter_400Regular',
      fontSize: 14,
      lineHeight: 20,
    },
  },
  caption: {
    paperVariant: 'labelSmall',
    style: {
      fontFamily: 'Inter_400Regular',
      fontSize: 12,
      lineHeight: 16,
    },
  },
  overline: {
    paperVariant: 'labelSmall',
    style: {
      fontFamily: 'Inter_700Bold',
      fontSize: 10,
      lineHeight: 14,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
  },
  // ---- legacy variants (pre-redesign call sites) ----
  title: {
    paperVariant: 'titleLarge',
    style: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 20,
      lineHeight: 26,
    },
  },
  subtitle: {
    paperVariant: 'titleMedium',
    style: {
      fontFamily: 'Inter_500Medium',
      fontSize: 16,
      lineHeight: 22,
    },
  },
  bodySmall: {
    paperVariant: 'bodyMedium',
    style: {
      fontFamily: 'Inter_400Regular',
      fontSize: 13,
      lineHeight: 18,
    },
  },
  label: {
    paperVariant: 'labelLarge',
    style: {
      fontFamily: 'Inter_500Medium',
      fontSize: 13,
      lineHeight: 18,
      letterSpacing: 0.5,
    },
  },
};
