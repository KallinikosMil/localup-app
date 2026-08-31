import React, { useState } from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { FormProvider, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';

import AppText from '@shared/components/AppText';
import GradientButton from '@shared/components/GradientButton';
import FullScreenLoader from '@shared/components/FullScreenLoader';
import InputField from '@shared/components/InputField';
import CustomModal from '@shared/components/CustomModal';
import AuthShell from '@features/auth/components/AuthShell';
import { useLogin, authErrorKey } from '@features/auth/hooks/useAuth';
import { useGoogleSignIn } from '@features/auth/hooks/useGoogleSignIn';
import useModal from '@shared/hooks/useModal';
import { useAppTheme } from '@theme/paper';
import { Spacing } from '@theme/constants/Spacing';
import { Layout } from '@theme/constants/Layout';
import { Translations } from '@features/auth/i18n/translationKeys';

type LoginFormData = {
  email: string;
  password: string;
};

const LoginScreen = () => {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const login = useLogin();
  const google = useGoogleSignIn();
  const { modalProps, openModal, closeModal } = useModal();
  const [modalMessage, setModalMessage] = useState('');

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
    google.reset();
    closeModal();
  };

  // Cancelling is a choice, not a failure: openAuthSessionAsync resolves
  // 'cancel'/'dismiss' and the hook maps those to 'cancelled', so nothing
  // is shown. AppGuard does the navigating on success.
  const onGoogle = () => {
    google.mutate(undefined, {
      onError: err => {
        setModalMessage(t(authErrorKey(err)));
        openModal();
      },
    });
  };

  // V1: the SAME component AppGuard renders while it resolves the
  // onboarding status. Sign-in resolves → this screen unmounts → AppGuard
  // takes the frame; identical pixels on both sides of that handoff, so it
  // reads as one continuous loader instead of two. The system browser
  // covers the screen for the Google leg, so the same loader sits behind
  // it — and is what the user lands back on if they cancel, rather than a
  // blank frame.
  if (login.isPending || google.isPending) {
    return <FullScreenLoader />;
  }

  return (
    <>
      <AuthShell
        title={t(Translations.AUTH_WELCOME_TEXT)}
        subtitle={t(Translations.AUTH_SUBTITLE_TEXT)}
        footer={
          <>
            <AppText
              variant="body"
              style={{
                color: theme.colors.onSurfaceFaint,
              }}
            >
              {t(Translations.AUTH_NO_ACCOUNT)}
            </AppText>
            <Pressable
              onPress={() => router.push('/auth/register')}
              accessibilityRole="link"
              accessibilityLabel={t(Translations.AUTH_REGISTER)}
              hitSlop={{
                top: Layout.HIT_SLOP_TEXT,
                bottom: Layout.HIT_SLOP_TEXT,
                left: Layout.HIT_SLOP,
                right: Layout.HIT_SLOP,
              }}
            >
              <AppText
                variant="body"
                style={[
                  styles.link,
                  {
                    color: theme.colors.primary,
                  },
                ]}
              >
                {t(Translations.AUTH_REGISTER)}
              </AppText>
            </Pressable>
          </>
        }
      >
        <FormProvider {...form}>
          <InputField
            name="email"
            icon="email-outline"
            label={t(Translations.AUTH_EMAIL_LABEL)}
            rules={{
              required: {
                value: true,
                message: t(Translations.AUTH_EMAIL_REQUIRED),
              },
              pattern: {
                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: t(Translations.AUTH_EMAIL_INVALID),
              },
            }}
            autoCapitalize="none"
            keyboardType="email-address"
            returnKeyType="next"
          />
          <InputField
            name="password"
            icon="lock-outline"
            label={t(Translations.AUTH_PASSWORD_LABEL)}
            rules={{
              required: {
                value: true,
                message: t(Translations.AUTH_PASSWORD_REQUIRED),
              },
            }}
            secureTextEntry
            returnKeyType="done"
          />
        </FormProvider>

        <Pressable
          onPress={() => router.push('/auth/forgot-password')}
          accessibilityRole="link"
          accessibilityLabel={t(Translations.AUTH_FORGOT_PASSWORD)}
          hitSlop={{
            top: Layout.HIT_SLOP_TEXT,
            bottom: Layout.HIT_SLOP_TEXT,
            left: Layout.HIT_SLOP,
            right: Layout.HIT_SLOP,
          }}
          style={styles.forgot}
        >
          <AppText
            variant="labelStrong"
            style={{
              color: theme.colors.primary,
            }}
          >
            {t(Translations.AUTH_FORGOT_PASSWORD)}
          </AppText>
        </Pressable>

        <GradientButton
          size="xl"
          onPress={onSubmit}
          disabled={login.isPending || !isValid}
        >
          {t(Translations.AUTH_LOGIN_BUTTON)}
        </GradientButton>

        <View style={styles.dividerRow}>
          <View
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
              color: theme.colors.onSurfaceFaint,
            }}
          >
            {t(Translations.AUTH_OR_DIVIDER)}
          </AppText>
          <View
            style={[
              styles.dividerLine,
              {
                backgroundColor: theme.colors.outlineVariant,
              },
            ]}
          />
        </View>

        {/* Google's mark must keep its own colours — their brand rules
            forbid tinting it — so this button is a surface, never the
            gradient. */}
        <Pressable
          onPress={onGoogle}
          accessibilityRole="button"
          accessibilityLabel={t(Translations.AUTH_GOOGLE_SIGN_IN)}
          style={[
            styles.googleButton,
            {
              backgroundColor: theme.colors.surfaceElevated,
              borderColor: theme.colors.outlineVariant,
            },
          ]}
        >
          <MaterialCommunityIcons
            importantForAccessibility="no"
            accessibilityElementsHidden
            name="google"
            size={19}
            color={theme.colors.onSurface}
          />
          <AppText
            variant="bodySmallStrong"
            style={{
              color: theme.colors.onSurface,
            }}
          >
            {t(Translations.AUTH_GOOGLE_SIGN_IN)}
          </AppText>
        </Pressable>
      </AuthShell>

      {/* CustomModal already centres and pads — the wrapper used to pad
          again on top of that, so this modal sat noticeably chunkier than
          the identical one on forgot-password. */}
      <CustomModal {...modalProps} onDismiss={handleDismiss}>
        <AppText
          variant="body"
          style={[
            styles.modalText,
            {
              color: theme.colors.error,
            },
          ]}
        >
          {modalMessage}
        </AppText>
      </CustomModal>
    </>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  forgot: {
    alignSelf: 'flex-end',
  },
  link: {
    fontFamily: 'Inter_700Bold',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg - 2,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  googleButton: {
    height: Layout.BUTTON_XL,
    borderRadius: Layout.BUTTON_XL_RADIUS,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Layout.FIELD_INNER_GAP,
  },
  modalText: {
    textAlign: 'center',
  },
});
