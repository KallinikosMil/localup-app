import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, useTheme } from 'react-native-paper';

import AppText from '@shared/components/AppText';
import { Spacing } from '@theme/constants/Spacing';

// V1. The login→routed transition used to cross THREE owners — the
// login screen's spinner, AppGuard's blank `null` while the onboarding
// status was unknown, and the destination screen's spinner — so the user
// saw a spinner, a blank frame, then another spinner. Same pixels in
// every one of those frames now, so the handoff is invisible.
// `message` is the same reassurance chat/matches/profile already show
// after ~4.5s of loading. Optional, so the silent fast path is unchanged.
export default function FullScreenLoader({ message }: { message?: string }) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: theme.colors.background,
        },
      ]}
    >
      <ActivityIndicator animating size="large" />
      {message ? (
        <AppText
          variant="body"
          style={{
            color: theme.colors.onSurfaceVariant,
            textAlign: 'center',
            marginTop: Spacing.SPACING_PADDING_16,
          }}
        >
          {message}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
