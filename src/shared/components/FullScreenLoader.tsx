import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, useTheme } from 'react-native-paper';

// V1. The login→routed transition used to cross THREE owners — the
// login screen's spinner, AppGuard's blank `null` while the onboarding
// status was unknown, and the destination screen's spinner — so the user
// saw a spinner, a blank frame, then another spinner. Same pixels in
// every one of those frames now, so the handoff is invisible.
export default function FullScreenLoader() {
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
