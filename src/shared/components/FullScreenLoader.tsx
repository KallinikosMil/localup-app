import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, useTheme } from 'react-native-paper';

import AppText from '@shared/components/AppText';
import { Spacing } from '@theme/constants/Spacing';

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
            marginTop: Spacing.lg,
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
