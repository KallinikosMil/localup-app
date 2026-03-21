import { TextStyle } from 'react-native';

export type TypographyVariant =
  | 'h1'
  | 'h2'
  | 'h3'
  | 'title'
  | 'subtitle'
  | 'body'
  | 'bodySmall'
  | 'label'
  | 'caption';

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

export const Typography: Record<
  TypographyVariant,
  TypographyDef
> = {
  h1: {
    paperVariant: 'displaySmall',
    style: {
      fontWeight: '700',
      letterSpacing: -1,
    },
  },
  h2: {
    paperVariant: 'headlineLarge',
    style: {
      fontWeight: '700',
      letterSpacing: -0.5,
    },
  },
  h3: {
    paperVariant: 'headlineSmall',
    style: {
      fontWeight: '600',
    },
  },
  title: {
    paperVariant: 'titleLarge',
    style: {
      fontWeight: '600',
    },
  },
  subtitle: {
    paperVariant: 'titleMedium',
    style: {
      fontWeight: '500',
    },
  },
  body: {
    paperVariant: 'bodyLarge',
    style: {
      fontWeight: '400',
    },
  },
  bodySmall: {
    paperVariant: 'bodyMedium',
    style: {
      fontWeight: '400',
    },
  },
  label: {
    paperVariant: 'labelLarge',
    style: {
      fontWeight: '500',
      letterSpacing: 0.5,
    },
  },
  caption: {
    paperVariant: 'labelSmall',
    style: {
      fontWeight: '400',
      letterSpacing: 0.4,
    },
  },
};
