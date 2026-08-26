import { TextStyle } from 'react-native';

export type TypographyVariant =
  | 'displayLg'
  | 'display'
  | 'wordmark'
  | 'wordmarkLg'
  | 'buttonXl'
  | 'rowTitle'
  | 'chatTitle'
  | 'message'
  | 'rowTitleQuiet'
  | 'bodySmallStrong'
  | 'microStrong'
  | 'buttonLg'
  | 'labelStrong'
  | 'micro'
  | 'nano'
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
  // Screen titles in the redesign, one step above h1. Paper has no
  // variant this large, so it borrows displayMedium's role and the
  // style below does the actual work.
  displayLg: {
    paperVariant: 'displayMedium',
    style: {
      fontFamily: 'PlusJakartaSans_800ExtraBold',
      fontSize: 34,
      lineHeight: 40,
      letterSpacing: -0.9,
    },
  },
  display: {
    paperVariant: 'displayMedium',
    style: {
      fontFamily: 'PlusJakartaSans_800ExtraBold',
      fontSize: 32,
      lineHeight: 38,
      letterSpacing: -0.8,
    },
  },
  // The LocalUp wordmark over a photo. Smaller than h1 and tighter,
  // because it is a mark rather than a heading.
  wordmark: {
    paperVariant: 'titleLarge',
    style: {
      fontFamily: 'PlusJakartaSans_800ExtraBold',
      fontSize: 19,
      lineHeight: 25,
      letterSpacing: -0.3,
    },
  },
  // The same mark beside the app icon on an auth screen, where it is the
  // only thing on the row and can afford to be bigger.
  wordmarkLg: {
    paperVariant: 'headlineLarge',
    style: {
      fontFamily: 'PlusJakartaSans_800ExtraBold',
      fontSize: 22,
      lineHeight: 28,
      letterSpacing: -0.4,
    },
  },
  // The label in a tall auth button.
  buttonXl: {
    paperVariant: 'labelLarge',
    style: {
      fontFamily: 'PlusJakartaSans_700Bold',
      fontSize: 16,
      lineHeight: 22,
    },
  },
  // A name at the head of a list row.
  rowTitle: {
    paperVariant: 'titleMedium',
    style: {
      fontFamily: 'PlusJakartaSans_700Bold',
      fontSize: 16,
      lineHeight: 22,
    },
  },
  // The name in a chat header. Between h3 and rowTitle, because it sits
  // beside a 38px avatar and has a subtitle under it.
  chatTitle: {
    paperVariant: 'titleMedium',
    style: {
      fontFamily: 'PlusJakartaSans_600SemiBold',
      fontSize: 17,
      lineHeight: 22,
    },
  },
  // Message text, and the composer that produces it. Deliberately larger
  // than body: it is the thing the screen exists for.
  message: {
    paperVariant: 'bodyLarge',
    style: {
      fontFamily: 'Inter_400Regular',
      fontSize: 15,
      lineHeight: 21,
    },
  },
  // The same size, one weight down: a row you have already read.
  rowTitleQuiet: {
    paperVariant: 'titleMedium',
    style: {
      fontFamily: 'PlusJakartaSans_600SemiBold',
      fontSize: 16,
      lineHeight: 22,
    },
  },
  // The label inside a large primary button.
  buttonLg: {
    paperVariant: 'labelLarge',
    style: {
      fontFamily: 'PlusJakartaSans_700Bold',
      fontSize: 15,
      lineHeight: 20,
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
  // Timestamps, counters and the names under the new-match avatars.
  micro: {
    paperVariant: 'labelSmall',
    style: {
      fontFamily: 'Inter_400Regular',
      fontSize: 11,
      lineHeight: 15,
    },
  },
  // The smallest thing in the app: the mode chip on a list row. Never
  // used for anything a reader has to read at length.
  nano: {
    paperVariant: 'labelSmall',
    style: {
      fontFamily: 'Inter_700Bold',
      fontSize: 9,
      lineHeight: 13,
      letterSpacing: 0.7,
      textTransform: 'uppercase',
    },
  },
  // `label` with the tracking removed and the weight up: a tab pill and
  // a footer action are words, not small-caps labels.
  labelStrong: {
    paperVariant: 'labelLarge',
    style: {
      fontFamily: 'Inter_700Bold',
      fontSize: 13,
      lineHeight: 18,
    },
  },
  bodySmallStrong: {
    paperVariant: 'bodyMedium',
    style: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 13,
      lineHeight: 19,
    },
  },
  microStrong: {
    paperVariant: 'labelSmall',
    style: {
      fontFamily: 'Inter_700Bold',
      fontSize: 11,
      lineHeight: 15,
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
  // 13/19 since the redesign — it is the message-preview line on a list
  // row, and 18 crowded a descender against the name above it.
  bodySmall: {
    paperVariant: 'bodyMedium',
    style: {
      fontFamily: 'Inter_400Regular',
      fontSize: 13,
      lineHeight: 19,
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
