import React, { useState } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FormProvider, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import AppText from '@shared/components/AppText';
import AppButton from '@shared/components/AppButton';
import FullScreenLoader from '@shared/components/FullScreenLoader';
import InputField from '@shared/components/InputField';
import Spacer from '@shared/components/Spacer';
import CustomModal from '@shared/components/CustomModal';
import useModal from '@shared/hooks/useModal';
import {
  useRequestPasswordReset,
  authErrorKey,
} from '@features/auth/hooks/useAuth';
import { Translations } from '@features/auth/i18n/translationKeys';
import { Spacing } from '@theme/constants/Spacing';

type ForgotFormData = { email: string };

// Step 1 of password recovery: ask Supabase to email a recovery link.
// The link lands back in the app (see passwordResetRedirectTo) and
// triggers PASSWORD_RECOVERY, which AppGuard turns into the reset screen.
const ForgotPasswordScreen = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const requestReset = useRequestPasswordReset();
  const { modalProps, openModal, closeModal } = useModal();
  const [modalMessage, setModalMessage] = useState('');
  const [sent, setSent] = useState(false);

  const form = useForm<ForgotFormData>({
    defaultValues: { email: '' },
    mode: 'onTouched',
  });

  const {
    handleSubmit,
    formState: { isValid },
  } = form;

  const onSubmit = handleSubmit(({ email }) => {
    requestReset.mutate(email, {
      // Success here means "Supabase accepted the request", NOT "that
      // address exists" — it answers the same way either way, on purpose.
      // The confirmation copy is worded to match.
      onSuccess: () => setSent(true),
      onError: err => {
        setModalMessage(t(authErrorKey(err)));
        openModal();
      },
    });
  });

  // The same loader login and register use, rather than a third centred
  // spinner with its own wrapper — the pending frame used to shift depending
  // on which auth screen you were on.
  if (requestReset.isPending) {
    return <FullScreenLoader />;
  }

  return (
    <>
      <View
        style={[
          styles.root,
          {
            backgroundColor: theme.colors.background,
            paddingTop: insets.top + Spacing.SPACING_PADDING_16,
            paddingBottom: insets.bottom,
          },
        ]}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {sent ? (
            <View style={styles.sentWrap}>
              <MaterialCommunityIcons
                name="email-check-outline"
                size={56}
                color={theme.colors.primary}
              />
              <Spacer spacing={Spacing.SPACING_PADDING_16} />
              <AppText
                variant="h2"
                style={{
                  color: theme.colors.onBackground,
                  textAlign: 'center',
                }}
              >
                {t(Translations.AUTH_FORGOT_SENT_TITLE)}
              </AppText>
              <Spacer spacing={Spacing.SPACING_PADDING_8} />
              <AppText
                variant="body"
                style={{
                  color: theme.colors.onSurfaceVariant,
                  textAlign: 'center',
                }}
              >
                {t(Translations.AUTH_FORGOT_SENT_BODY)}
              </AppText>
            </View>
          ) : (
            <>
              <AppText
                variant="h1"
                style={{ color: theme.colors.onBackground }}
              >
                {t(Translations.AUTH_FORGOT_TITLE)}
              </AppText>
              <Spacer spacing={Spacing.SPACING_PADDING_8} />
              <AppText
                variant="body"
                style={{ color: theme.colors.onSurfaceVariant }}
              >
                {t(Translations.AUTH_FORGOT_SUBTITLE)}
              </AppText>

              <Spacer spacing={Spacing.SPACING_PADDING_24} />

              <FormProvider {...form}>
                <InputField<ForgotFormData>
                  name="email"
                  label={t(Translations.AUTH_EMAIL_LABEL)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  returnKeyType="done"
                  rules={{
                    required: {
                      value: true,
                      message: t(Translations.AUTH_EMAIL_REQUIRED),
                    },
                  }}
                />
              </FormProvider>

              <Spacer spacing={Spacing.SPACING_PADDING_24} />

              <AppButton
                variant="primary"
                onPress={onSubmit}
                disabled={!isValid}
              >
                {t(Translations.AUTH_FORGOT_SEND)}
              </AppButton>
            </>
          )}

          <Spacer spacing={Spacing.SPACING_PADDING_16} />

          <AppButton variant="link" onPress={() => router.back()}>
            {t(Translations.AUTH_FORGOT_BACK)}
          </AppButton>
        </ScrollView>
      </View>

      {/* CustomModal already centres its children, so the wrapper only
          repeated what the modal does. */}
      <CustomModal {...modalProps} onDismiss={closeModal}>
        <AppText
          variant="body"
          style={{ color: theme.colors.error, textAlign: 'center' }}
        >
          {modalMessage || t(Translations.AUTH_ERROR_FALLBACK)}
        </AppText>
        <Spacer spacing={Spacing.SPACING_PADDING_16} />
        <AppButton variant="primary" onPress={closeModal}>
          {t(Translations.AUTH_DISMISS)}
        </AppButton>
      </CustomModal>
    </>
  );
};

export default ForgotPasswordScreen;

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.SPACING_PADDING_24,
  },
  sentWrap: { alignItems: 'center' },
});
