import React from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { hiddenFromScreenReader } from '@shared/a11y';

// Every icon in the app, hidden from the accessibility tree by default.
//
// A vector icon is a Text node holding a private-use character. Left
// exposed it takes a focus stop and announces nothing — the LocalUp mark
// and the mail and lock glyphs inside the input boxes all did.
//
// The DEFAULT is the whole point, and it is safe here because no icon in
// this app is ever the name of anything: every interactive element
// carries its own accessibilityLabel or wraps its own text. That was
// checked, not assumed.
//
// It is a default and not a rule: the spread comes last, so an icon that
// ever does need announcing says so at the call site —
//
//   <AppIcon name="alert" importantForAccessibility="yes"
//            accessibilityElementsHidden={false} accessibilityLabel="…" />
//
// The pair itself lives in shared/a11y so it can be spread onto anything
// else too; this component only saves 71 call sites from repeating it.

export type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

export type AppIconProps = React.ComponentProps<typeof MaterialCommunityIcons>;

const AppIcon = (props: AppIconProps) => (
  <MaterialCommunityIcons {...hiddenFromScreenReader} {...props} />
);

export default AppIcon;
