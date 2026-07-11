import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ActivityIndicator, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';

import AppText from '@shared/components/AppText';
import Spacer from '@shared/components/Spacer';
import { Translations as Common } from '@shared/i18n/translationKeys';
import { RootState } from '@store';
import { Spacing } from '@theme/constants/Spacing';
import { BorderRadius } from '@theme/constants/BorderRadius';
import { Translations } from '@features/auth/i18n/translationKeys';
import { retryAuthBootstrap } from '@features/auth/hooks/useAuthSession';

// W13: shown when we could NOT determine the user's account state.
// The whole point is that we don't guess — we say so and offer a
// retry, instead of picking a branch (which used to mean routing an
// onboarded user back through onboarding and overwriting them).
export default function AuthErrorScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  // V10: the body used to be a flat "Check your connection and try
  // again." for EVERY bootstrap failure — including a 500, where the
  // user's connection is fine and we've just sent them to reboot their
  // router. useAuthSession classified the failure on structured fields;
  // we render its verdict.
  const offline = useSelector((s: RootState) => s.auth.authErrorOffline);
  const [retrying, setRetrying] = useState(false);

  const onRetry = async () => {
    if (retrying) return;
    setRetrying(true);
    try {
      await retryAuthBootstrap();
    } finally {
      setRetrying(false);
    }
  };

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: theme.colors.background,
        },
      ]}
    >
      <MaterialCommunityIcons
        name="alert-circle-outline"
        size={48}
        color={theme.colors.onSurfaceVariant}
      />
      <Spacer spacing={Spacing.lg} />
      <AppText
        variant="h3"
        style={[
          styles.centerText,
          {
            color: theme.colors.onBackground,
          },
        ]}
      >
        {t(Translations.AUTH_BOOTSTRAP_ERROR_TITLE)}
      </AppText>
      <Spacer spacing={Spacing.sm} />
      <AppText
        variant="body"
        style={[
          styles.centerText,
          {
            color: theme.colors.onSurfaceVariant,
          },
        ]}
      >
        {offline
          ? t(Common.COMMON_ERROR_OFFLINE)
          : t(Common.COMMON_ERROR_GENERIC)}
      </AppText>
      <Pressable
        onPress={onRetry}
        disabled={retrying}
        hitSlop={8}
        style={[
          styles.retryBtn,
          {
            backgroundColor: theme.colors.primary,
            opacity: retrying ? 0.6 : 1,
          },
        ]}
      >
        {retrying ? (
          <ActivityIndicator size="small" color={theme.colors.onPrimary} />
        ) : (
          <AppText
            variant="body"
            style={[
              styles.retryLabel,
              {
                color: theme.colors.onPrimary,
              },
            ]}
          >
            {t(Translations.AUTH_BOOTSTRAP_RETRY)}
          </AppText>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  centerText: {
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: Spacing.xl,
    minWidth: 140,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.pill,
  },
  retryLabel: {
    fontWeight: '600',
  },
});
