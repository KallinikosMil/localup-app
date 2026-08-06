import React, { useState } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { Text, IconButton, Divider } from 'react-native-paper';
import { useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FormProvider, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';

import AppText from '@shared/components/AppText';
import AppButton from '@shared/components/AppButton';
import FullScreenLoader from '@shared/components/FullScreenLoader';
import Spacer from '@shared/components/Spacer';
import InputField from '@shared/components/InputField';
import CustomModal from '@shared/components/CustomModal';
import { useLogin, authErrorKey } from '@features/auth/hooks/useAuth';
import useModal from '@shared/hooks/useModal';
import { Spacing } from '@theme/constants/Spacing';
import { Translations } from '@features/auth/i18n/translationKeys';
import { useThemeMode } from '@theme/ThemeModeProvider';

type LoginFormData = {
  email: string;
  password: string;
};

const LoginScreen = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { setMode, resolvedMode } = useThemeMode();
  const login = useLogin();
  const { modalProps, openModal, closeModal } = useModal();
  const [modalMessage, setModalMessage] = useState('');

  const toggleTheme = () => {
    setMode(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const form = useForm<LoginFormData>({
    defaultValues: {
      email: '',
      password: '',
    },
    mode: 'onTouched',
  });

  const {
    handleSubmit,
    formState: { isValid },
  } = form;

  const onSubmit = handleSubmit(({ email, password }) => {
    login.mutate(
      { email, password },
      {
        // H5: this used to render `err.message` — Supabase's own English
        // prose ("Invalid login credentials") — straight into the modal,
        // bypassing i18n entirely. authErrorKey classifies the error on
        // its structured fields and hands back a translation key.
        onError: err => {
          setModalMessage(t(authErrorKey(err)));
          openModal();
        },
      },
    );
  });

  const handleDismiss = () => {
    login.reset();
    closeModal();
  };

  const goToRegister = () => {
    router.push('/auth/register');
  };

  // V1: the SAME component AppGuard renders while it resolves the
  // onboarding status. sign-in resolves → this screen unmounts →
  // AppGuard takes the frame; identical pixels on both sides of that
  // handoff, so it reads as one continuous loader instead of two.
  if (login.isPending) {
    return <FullScreenLoader />;
  }

  return (
    <>
      <View
        style={[
          styles.root,
          {
            backgroundColor: theme.colors.background,
            paddingBottom: insets.bottom,
          },
        ]}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.themeRow}>
            <IconButton
              icon={
                resolvedMode === 'dark'
                  ? 'white-balance-sunny'
                  : 'moon-waning-crescent'
              }
              size={24}
              onPress={toggleTheme}
            />
          </View>

          <View style={styles.heroSection}>
            <AppText
              variant="h1"
              style={{
                color: theme.colors.primary,
              }}
            >
              {t(Translations.AUTH_HEADER_TEXT)}
            </AppText>
            <Spacer spacing={Spacing.SPACING_PADDING_8} />
            <AppText
              variant="h3"
              style={{
                color: theme.colors.onBackground,
              }}
            >
              {t(Translations.AUTH_WELCOME_TEXT)}
            </AppText>
            <Spacer spacing={Spacing.SPACING_PADDING_8} />
            <AppText
              variant="body"
              style={{
                color: theme.colors.onSurfaceVariant,
                textAlign: 'center',
              }}
            >
              {t(Translations.AUTH_SUBTITLE_TEXT)}
            </AppText>
          </View>

          <Spacer spacing={Spacing.SPACING_PADDING_32} />

          <View style={styles.formSection}>
            <FormProvider {...form}>
              <InputField
                name="email"
                label={t(Translations.AUTH_EMAIL_LABEL)}
                rules={{
                  required: {
                    value: true,
                    message: 'Please enter your email',
                  },
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: 'Please enter a valid email',
                  },
                }}
                dense
                autoCapitalize="none"
                keyboardType="email-address"
                returnKeyType="next"
              />
              <Spacer spacing={Spacing.SPACING_PADDING_16} />
              <InputField
                name="password"
                label={t(Translations.AUTH_PASSWORD_LABEL)}
                rules={{
                  required: {
                    value: true,
                    message: 'Please enter your password',
                  },
                }}
                dense
                secureTextEntry
                returnKeyType="done"
              />
            </FormProvider>

            <View style={styles.forgotRow}>
              <AppButton
                variant="link"
                compact
                onPress={() => router.push('/auth/forgot-password')}
                contentStyle={null}
                labelStyle={styles.forgotLabel}
              >
                {t(Translations.AUTH_FORGOT_PASSWORD)}
              </AppButton>
            </View>

            <Spacer spacing={Spacing.SPACING_PADDING_24} />

            <AppButton
              variant="primary"
              onPress={onSubmit}
              disabled={login.isPending || !isValid}
            >
              {t(Translations.AUTH_LOGIN_BUTTON)}
            </AppButton>

            <Spacer spacing={Spacing.SPACING_PADDING_24} />

            <View style={styles.dividerRow}>
              <Divider
                style={[
                  styles.dividerLine,
                  {
                    backgroundColor: theme.colors.outlineVariant,
                  },
                ]}
              />
              <AppText
                variant="caption"
                style={{
                  color: theme.colors.onSurfaceVariant,
                  paddingHorizontal: Spacing.SPACING_PADDING_16,
                }}
              >
                {t(Translations.AUTH_OR_DIVIDER)}
              </AppText>
              <Divider
                style={[
                  styles.dividerLine,
                  {
                    backgroundColor: theme.colors.outlineVariant,
                  },
                ]}
              />
            </View>

            <Spacer spacing={Spacing.SPACING_PADDING_24} />

            <AppButton variant="google" icon="google" onPress={() => {}}>
              {t(Translations.AUTH_GOOGLE_SIGN_IN)}
            </AppButton>
          </View>

          <View style={styles.registerRow}>
            <AppText
              variant="bodySmall"
              style={{
                color: theme.colors.onSurfaceVariant,
              }}
            >
              {t(Translations.AUTH_NO_ACCOUNT)}
            </AppText>
            <AppText
              variant="bodySmall"
              onPress={goToRegister}
              style={[
                styles.authLink,
                {
                  color: theme.colors.primary,
                },
              ]}
            >
              {t(Translations.AUTH_REGISTER)}
            </AppText>
          </View>
        </ScrollView>
      </View>

      <CustomModal {...modalProps} onDismiss={handleDismiss}>
        <View style={styles.modalContent}>
          <Text
            variant="bodyMedium"
            style={{
              color: theme.colors.error,
            }}
          >
            {modalMessage || t(Translations.AUTH_ERROR_FALLBACK)}
          </Text>
          <Spacer spacing={Spacing.SPACING_PADDING_16} />
          <AppButton variant="primary" onPress={handleDismiss}>
            {t(Translations.AUTH_DISMISS)}
          </AppButton>
        </View>
      </CustomModal>
    </>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.SPACING_PADDING_24,
  },
  themeRow: {
    width: '100%',
    alignItems: 'flex-end',
    paddingTop: Spacing.SPACING_PADDING_8,
  },
  heroSection: {
    alignItems: 'center',
    marginTop: Spacing.SPACING_PADDING_24,
  },
  formSection: {
    width: '100%',
    maxWidth: 360,
    alignSelf: 'center',
  },
  forgotRow: {
    alignItems: 'flex-end',
    marginTop: Spacing.SPACING_PADDING_8 / 2,
  },
  forgotLabel: {
    fontSize: 13,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  registerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.SPACING_PADDING_16,
  },
  authLink: {
    marginLeft: Spacing.SPACING_PADDING_8 / 2,
    fontWeight: '600',
  },
  modalContent: {
    alignItems: 'center',
    padding: Spacing.SPACING_PADDING_24,
    borderRadius: Spacing.SPACING_PADDING_16,
  },
});
