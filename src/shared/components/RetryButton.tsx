import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import AppText from '@shared/components/AppText';
import { useAppTheme } from '@theme/paper';
import { BorderRadius } from '@theme/constants/BorderRadius';
import { Spacing } from '@theme/constants/Spacing';

// The "try again" pill that follows every error message in the app.
//
// It existed six times — discover, matches, profile, profile/edit, chat and
// AuthErrorScreen — as six copies of the same Pressable, and the copies had
// already drifted: three different paddings, so the same button rendered at
// three different sizes depending on which screen had failed. Nobody chose
// that; it is just what happens when a shape is pasted rather than named.
//
// One definition means one size, and it means the accessibility props are
// attached once instead of six times (they were missing from all six).
type RetryButtonProps = {
  label: string;
  onPress: () => void;
  // AuthErrorScreen swaps the label for a spinner while the retry is in
  // flight; everywhere else the retry is instant enough not to bother.
  busy?: boolean;
  minWidth?: number;
};

const RetryButton = ({
  label,
  onPress,
  busy = false,
  minWidth,
}: RetryButtonProps) => {
  const theme = useAppTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={label}
      // `busy` is what a screen reader needs to hear; the 0.6 opacity below
      // says the same thing to everyone else.
      accessibilityState={{ disabled: busy, busy }}
      hitSlop={8}
      style={[
        styles.button,
        {
          backgroundColor: theme.colors.primary,
          opacity: busy ? 0.6 : 1,
        },
        minWidth ? { minWidth } : null,
      ]}
    >
      {busy ? (
        <ActivityIndicator size="small" color={theme.colors.onPrimary} />
      ) : (
        <AppText
          variant="body"
          style={[styles.label, { color: theme.colors.onPrimary }]}
        >
          {label}
        </AppText>
      )}
    </Pressable>
  );
};

export default RetryButton;

const styles = StyleSheet.create({
  button: {
    marginTop: Spacing.SPACING_PADDING_16,
    paddingHorizontal: Spacing.SPACING_PADDING_24,
    paddingVertical: Spacing.SPACING_PADDING_8,
    borderRadius: BorderRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontWeight: '600',
  },
});
