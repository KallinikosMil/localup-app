import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import {
  ActivityIndicator,
  Button,
  Text,
  IconButton,
  Divider,
} from 'react-native-paper';
import { useTheme } from 'react-native-paper';
import AppText from '@shared/components/AppText';
import { FormProvider, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { useLogin } from '@features/auth/hooks/useAuth';
import useModal from '@shared/hooks/useModal';

import Spacer from '@shared/components/Spacer';
import InputField from '@shared/components/InputField';
import CustomModal from '@shared/components/CustomModal';

import { Spacing } from '@theme/constants/Spacing';
import { Translations } from '@features/auth/i18n/translationKeys';
import { useThemeMode } from '@theme/ThemeModeProvider';

type LoginFormData = {
  email: string;
  password: string;
};

const PILL_RADIUS = 28;

const LoginScreen = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { setMode, resolvedMode } = useThemeMode();
  const login = useLogin();
  const { modalProps, openModal, closeModal } =
    useModal();
  const [modalMessage, setModalMessage] =
    useState('');

  const toggleTheme = () => {
    setMode(prev =>
      prev === 'light' ? 'dark' : 'light',
    );
  };

  const form = useForm<LoginFormData>({
    defaultValues: { email: '', password: '' },
    mode: 'onBlur',
    reValidateMode: 'onBlur',
  });

  const {
    handleSubmit,
    formState: { isValid },
  } = form;

  const onSubmit = handleSubmit(
    ({ email, password }) => {
      login.mutate(
        { email, password },
        {
          onError: err => {
            setModalMessage(
              err instanceof Error
                ? err.message
                : 'Login failed',
            );
            openModal();
          },
        },
      );
    },
  );

  const handleDismiss = () => {
    login.reset();
    closeModal();
  };

  return (
    <>
      <KeyboardAvoidingView
        style={[
          styles.root,
          {
            backgroundColor:
              theme.colors.background,
          },
        ]}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : 'height'
        }
      >
        {login.isPending ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator
              animating
              size="large"
            />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={
              styles.scrollContent
            }
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
              <Spacer
                spacing={Spacing.SPACING_PADDING_8}
              />
              <AppText
                variant="h3"
                style={{
                  color:
                    theme.colors.onBackground,
                }}
              >
                {t(Translations.AUTH_WELCOME_TEXT)}
              </AppText>
              <Spacer
                spacing={Spacing.SPACING_PADDING_8}
              />
              <AppText
                variant="body"
                style={{
                  color:
                    theme.colors.onSurfaceVariant,
                  textAlign: 'center',
                }}
              >
                {t(Translations.AUTH_SUBTITLE_TEXT)}
              </AppText>
            </View>

            <Spacer
              spacing={Spacing.SPACING_PADDING_32}
            />

            <View style={styles.formSection}>
              <FormProvider {...form}>
                <InputField
                  name="email"
                  label={t(
                    Translations.AUTH_EMAIL_LABEL,
                  )}
                  rules={{
                    required: {
                      value: true,
                      message:
                        'Please enter your email',
                    },
                    pattern: {
                      value:
                        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message:
                        'Please enter a valid email',
                    },
                  }}
                  dense
                  autoCapitalize="none"
                  keyboardType="email-address"
                  returnKeyType="next"
                />
                <Spacer
                  spacing={Spacing.SPACING_PADDING_16}
                />
                <InputField
                  name="password"
                  label={t(
                    Translations.AUTH_PASSWORD_LABEL,
                  )}
                  rules={{
                    required: {
                      value: true,
                      message:
                        'Please enter your password',
                    },
                  }}
                  dense
                  secureTextEntry
                  returnKeyType="done"
                />
              </FormProvider>

              <View style={styles.forgotRow}>
                <Button
                  mode="text"
                  compact
                  labelStyle={styles.forgotLabel}
                  onPress={() => {}}
                >
                  {t(
                    Translations.AUTH_FORGOT_PASSWORD,
                  )}
                </Button>
              </View>

              <Spacer
                spacing={Spacing.SPACING_PADDING_24}
              />

              <Button
                mode="contained"
                onPress={onSubmit}
                disabled={
                  login.isPending || !isValid
                }
                contentStyle={styles.btnContent}
                style={styles.pillBtn}
                labelStyle={styles.loginBtnLabel}
              >
                {t(Translations.AUTH_LOGIN_BUTTON)}
              </Button>

              <Spacer
                spacing={Spacing.SPACING_PADDING_24}
              />

              <View style={styles.dividerRow}>
                <Divider
                  style={[
                    styles.dividerLine,
                    {
                      backgroundColor:
                        theme.colors.outlineVariant,
                    },
                  ]}
                />
                <AppText
                  variant="caption"
                  style={{
                    color:
                      theme.colors.onSurfaceVariant,
                    paddingHorizontal: 16,
                  }}
                >
                  {t(Translations.AUTH_OR_DIVIDER)}
                </AppText>
                <Divider
                  style={[
                    styles.dividerLine,
                    {
                      backgroundColor:
                        theme.colors.outlineVariant,
                    },
                  ]}
                />
              </View>

              <Spacer
                spacing={Spacing.SPACING_PADDING_24}
              />

              <Button
                mode="outlined"
                icon="google"
                onPress={() => {}}
                contentStyle={styles.btnContent}
                style={[
                  styles.pillBtn,
                  {
                    borderColor:
                      theme.colors.outline,
                  },
                ]}
                textColor={
                  theme.colors.onBackground
                }
              >
                {t(
                  Translations.AUTH_GOOGLE_SIGN_IN,
                )}
              </Button>
            </View>

            <View style={styles.registerRow}>
              <AppText
                variant="bodySmall"
                style={{
                  color:
                    theme.colors.onSurfaceVariant,
                }}
              >
                {t(Translations.AUTH_NO_ACCOUNT)}
              </AppText>
              <Button
                mode="text"
                compact
                onPress={() =>
                  router.push('/auth/register')
                }
                disabled={login.isPending}
                labelStyle={{
                  color: theme.colors.primary,
                }}
              >
                {t(Translations.AUTH_REGISTER)}
              </Button>
            </View>
          </ScrollView>
        )}
      </KeyboardAvoidingView>

      <CustomModal
        {...modalProps}
        onDismiss={handleDismiss}
      >
        <View style={styles.modalContent}>
          <Text
            variant="bodyMedium"
            style={{ color: theme.colors.error }}
          >
            {modalMessage ||
              'Something went wrong. Please try again.'}
          </Text>
          <Spacer
            spacing={Spacing.SPACING_PADDING_16}
          />
          <Button
            mode="contained"
            onPress={handleDismiss}
            buttonColor={theme.colors.primary}
            textColor={theme.colors.onPrimary}
          >
            Dismiss
          </Button>
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
  loaderWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  themeRow: {
    width: '100%',
    alignItems: 'flex-end',
    paddingTop: 8,
  },
  heroSection: {
    alignItems: 'center',
    marginTop: 24,
  },
  formSection: {
    width: '100%',
    maxWidth: 360,
    alignSelf: 'center',
  },
  forgotRow: {
    alignItems: 'flex-end',
    marginTop: 4,
  },
  forgotLabel: {
    fontSize: 13,
  },
  pillBtn: {
    borderRadius: PILL_RADIUS,
  },
  btnContent: {
    height: 52,
  },
  loginBtnLabel: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
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
    marginTop: 'auto',
    paddingTop: 32,
  },
  modalContent: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 16,
  },
});
