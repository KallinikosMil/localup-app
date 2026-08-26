import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';

import AppText from '@shared/components/AppText';
import RetryButton from '@shared/components/RetryButton';
import Spacer from '@shared/components/Spacer';
import { RootState } from '@store';
import { retryAuthBootstrap } from '@features/auth/hooks/useAuthSession';
import { Translations as Common } from '@shared/i18n/translationKeys';
import { Spacing } from '@theme/constants/Spacing';
import { Translations } from '@features/auth/i18n/translationKeys';

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
      <RetryButton
        label={t(Translations.AUTH_BOOTSTRAP_RETRY)}
        onPress={onRetry}
        busy={retrying}
        minWidth={140}
      />
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
});
