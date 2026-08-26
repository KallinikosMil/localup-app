import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppTheme } from '@theme/paper';
import { Spacing } from '@theme/constants/Spacing';
import { Layout } from '@theme/constants/Layout';

// The app used to wrap EVERY screen in one SafeAreaView, up in Shell. The
// redesign is photo-led — Discover's hero runs edge to edge, under the
// status bar and behind the floating tab bar — and a shared parent inset
// makes that impossible: a child cannot opt out of its parent's padding.
//
// So the inset moved down here, and each screen says whether it wants it.
// Full-bleed screens simply do not use this; everything else wraps its
// root in it and looks exactly as it did before.
//
// As screens are rebuilt against the new design they will drop this and
// take the insets themselves, because most of them want the status bar
// area PAINTED but not empty.

type Props = {
  children: React.ReactNode;
  // Tab screens only. The tab bar floats OVER the content now, so unlike
  // a docked bar it takes no layout space — without this the last row of
  // a list, or a Logout button, ends up underneath it.
  reserveTabBar?: boolean;
};

const ScreenSafeArea = ({ children, reserveTabBar = false }: Props) => {
  const theme = useAppTheme();

  return (
    <SafeAreaView
      style={[
        {
          flex: 1,
          backgroundColor: theme.colors.background,
        },
        reserveTabBar
          ? {
              // The inset itself is already consumed by SafeAreaView, so
              // this is only the bar and the gap the bar floats above.
              paddingBottom: Layout.TAB_BAR_HEIGHT + Spacing.lg,
            }
          : null,
      ]}
    >
      {children}
    </SafeAreaView>
  );
};

export default ScreenSafeArea;
