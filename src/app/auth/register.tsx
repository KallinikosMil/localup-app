import React, { useState } from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { FormProvider, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';

import AppText from '@shared/components/AppText';
import GradientButton from '@shared/components/GradientButton';
import AuthShell from '@features/auth/components/AuthShell';
import AppButton from '@shared/components/AppButton';
import FullScreenLoader from '@shared/components/FullScreenLoader';
import Spacer from '@shared/components/Spacer';
import InputField from '@shared/components/InputField';
import CustomModal from '@shared/components/CustomModal';
import { useRegister, authErrorKey } from '@features/auth/hooks/useAuth';
import { useGoogleSignIn } from '@features/auth/hooks/useGoogleSignIn';
import useModal from '@shared/hooks/useModal';
import { useAppTheme } from '@theme/paper';
import { Spacing } from '@theme/constants/Spacing';
import { Layout } from '@theme/constants/Layout';
import { Translations } from '@features/auth/i18n/translationKeys';

type RegisterFormData = {
  email: string;
  password: string;
  confirmPassword: string;
};

const RegisterScreen = () => {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const register = useRegister();
  const google = useGoogleSignIn();
  const { modalProps, openModal, closeModal } = useModal();
  const [modalMessage, setModalMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const form = useForm<RegisterFormData>({
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
    },
    mode: 'onTouched',
  });

  const {
    handleSubmit,
    formState: { isValid },
  } = form;

  const onSubmit = handleSubmit(data => {
    register.mutate(
      {
        email: data.email,
        password: data.password,
      },
      {
        onSuccess: () => {
          setIsSuccess(true);
          setModalMessage(t(Translations.AUTH_CONFIRM_EMAIL_SENT));
          openModal();
        },
        // H5: `err.message` went straight to the user — raw provider
        // prose, untranslated. The duplicate-email case also lived in a
        // hand-thrown English Error. Both are classified codes now.
        onError: err => {
          setIsSuccess(false);
          setModalMessage(t(authErrorKey(err)));
          openModal();
        },
      },
    );
  });

  const handleDismiss = () => {
    register.reset();
    google.reset();
    closeModal();
  };

  // Signing up with Google and signing in with Google are the same call —
  // the provider decides whether the account already exists.
  const onGoogle = () => {
    google.mutate(undefined, {
      onError: err => {
        setIsSuccess(false);
        setModalMessage(t(authErrorKey(err)));
        openModal();
      },
    });
  };

  const goToLogin = () => {
    router.back();
  };

  // The same loader login uses, rather than a third hand-rolled centred
  // spinner. Each auth screen had its own, with its own wrapper style, so
  // the pending frame shifted depending on which screen you were on.
  if (register.isPending || google.isPending) {
    return <FullScreenLoader />;
  }

  return (
    <>
      <AuthShell
        title={t(Translations.AUTH_CREATE_ACCOUNT_TITLE)}
        subtitle={t(Translations.AUTH_CREATE_ACCOUNT_SUBTITLE)}
        footer={
          <>
            <AppText
              variant="body"
              style={{
                color: theme.colors.onSurfaceFaint,
              }}
            >
              {t(Translations.AUTH_HAS_ACCOUNT)}
            </AppText>
            <Pressable
              onPress={goToLogin}
              accessibilityRole="link"
              accessibilityLabel={t(Translations.AUTH_LOGIN_LINK)}
              hitSlop={Layout.HIT_SLOP}
            >
              <AppText
                variant="body"
                style={[
                  styles.authLink,
                  {
                    color: theme.colors.primary,
                  },
                ]}
              >
                {t(Translations.AUTH_LOGIN_LINK)}
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
              minLength: {
                value: 8,
                message: t(Translations.AUTH_PASSWORD_MIN),
              },
            }}
            secureTextEntry
            returnKeyType="next"
          />
          <InputField
            name="confirmPassword"
            icon="lock-check-outline"
            label={t(Translations.AUTH_CONFIRM_PASSWORD_LABEL)}
            rules={{
              required: {
                value: true,
                message: t(Translations.AUTH_CONFIRM_PASSWORD_REQUIRED),
              },
              validate: value =>
                value === form.getValues('password') ||
                t(Translations.AUTH_PASSWORD_MISMATCH),
              deps: ['password'],
            }}
            secureTextEntry
            returnKeyType="done"
          />
        </FormProvider>

        <GradientButton
          size="xl"
          onPress={onSubmit}
          disabled={register.isPending || !isValid}
        >
          {t(Translations.AUTH_CREATE_ACCOUNT_BUTTON)}
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

        {/* Google's mark must keep its own colours — their brand
                rules forbid tinting it — so this button is a surface,
                never the gradient. */}
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

      {/* CustomModal already centres and pads by 24 — the wrapper used to pad
          another 24 on top of that, so this modal sat noticeably chunkier than
          the identical one on forgot-password. AppText, not Paper's Text, for
          the same reason every other string in the app uses it. */}
      <CustomModal {...modalProps} onDismiss={handleDismiss}>
        <AppText
          variant="body"
          style={[
            styles.modalText,
            {
              color: isSuccess ? theme.colors.primary : theme.colors.error,
            },
          ]}
        >
          {modalMessage || t(Translations.AUTH_ERROR_FALLBACK)}
        </AppText>
        <Spacer spacing={Spacing.SPACING_PADDING_16} />
        <AppButton variant="primary" onPress={handleDismiss}>
          {t(Translations.AUTH_DISMISS)}
        </AppButton>
      </CustomModal>
    </>
  );
};

export default RegisterScreen;

const styles = StyleSheet.create({
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
  authLink: {
    fontFamily: 'Inter_700Bold',
  },
  modalText: {
    textAlign: 'center',
  },
});
