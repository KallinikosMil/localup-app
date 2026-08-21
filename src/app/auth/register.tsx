import React, { useState } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { Divider, useTheme } from 'react-native-paper';
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
import { useRegister, authErrorKey } from '@features/auth/hooks/useAuth';
import useModal from '@shared/hooks/useModal';
import { Spacing } from '@theme/constants/Spacing';
import { Translations } from '@features/auth/i18n/translationKeys';

type RegisterFormData = {
  email: string;
  password: string;
  confirmPassword: string;
};

const RegisterScreen = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const register = useRegister();
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
    closeModal();
  };

  const goToLogin = () => {
    router.back();
  };

  // The same loader login uses, rather than a third hand-rolled centred
  // spinner. Each auth screen had its own, with its own wrapper style, so
  // the pending frame shifted depending on which screen you were on.
  if (register.isPending) {
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
              {t(Translations.AUTH_CREATE_ACCOUNT_TITLE)}
            </AppText>
            <Spacer spacing={Spacing.SPACING_PADDING_8} />
            <AppText
              variant="body"
              style={{
                color: theme.colors.onSurfaceVariant,
                textAlign: 'center',
              }}
            >
              {t(Translations.AUTH_CREATE_ACCOUNT_SUBTITLE)}
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
              <Spacer spacing={Spacing.SPACING_PADDING_16} />
              <InputField
                name="password"
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
              <Spacer spacing={Spacing.SPACING_PADDING_16} />
              <InputField
                name="confirmPassword"
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

            <Spacer spacing={Spacing.SPACING_PADDING_24} />

            <AppButton
              variant="primary"
              onPress={onSubmit}
              disabled={register.isPending || !isValid}
            >
              {t(Translations.AUTH_CREATE_ACCOUNT_BUTTON)}
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

          <View style={styles.loginRow}>
            <AppText
              variant="bodySmall"
              style={{
                color: theme.colors.onSurfaceVariant,
              }}
            >
              {t(Translations.AUTH_HAS_ACCOUNT)}
            </AppText>
            <AppText
              variant="bodySmall"
              onPress={goToLogin}
              style={[
                styles.authLink,
                {
                  color: theme.colors.primary,
                },
              ]}
            >
              {t(Translations.AUTH_LOGIN_LINK)}
            </AppText>
          </View>
        </ScrollView>
      </View>

      {/* CustomModal already centres and pads by 24 — the wrapper used to pad
          another 24 on top of that, so this modal sat noticeably chunkier than
          the identical one on forgot-password. AppText, not Paper's Text, for
          the same reason every other string in the app uses it. */}
      <CustomModal {...modalProps} onDismiss={handleDismiss}>
        <AppText
          variant="body"
          style={{
            color: isSuccess ? theme.colors.primary : theme.colors.error,
            textAlign: 'center',
          }}
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
  root: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.SPACING_PADDING_24,
    paddingTop: Spacing.SPACING_PADDING_60,
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
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  loginRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.SPACING_PADDING_16,
  },
  authLink: {
    marginLeft: Spacing.SPACING_PADDING_8 / 2,
    fontWeight: '600',
  },
});
