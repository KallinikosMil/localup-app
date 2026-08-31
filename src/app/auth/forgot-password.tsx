import React, { useState } from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import { FormProvider, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import AppText from '@shared/components/AppText';
import AppButton from '@shared/components/AppButton';
import GradientButton from '@shared/components/GradientButton';
import FullScreenLoader from '@shared/components/FullScreenLoader';
import InputField from '@shared/components/InputField';
import Spacer from '@shared/components/Spacer';
import CustomModal from '@shared/components/CustomModal';
import AuthShell from '@features/auth/components/AuthShell';
import useModal from '@shared/hooks/useModal';
import {
  useRequestPasswordReset,
  authErrorKey,
} from '@features/auth/hooks/useAuth';
import { Translations } from '@features/auth/i18n/translationKeys';
import { useAppTheme } from '@theme/paper';
import { Spacing } from '@theme/constants/Spacing';
import { Layout } from '@theme/constants/Layout';

type ForgotFormData = { email: string };

// Step 1 of password recovery: ask Supabase to email a recovery link.
// The link lands back in the app (see passwordResetRedirectTo) and
// triggers PASSWORD_RECOVERY, which AppGuard turns into the reset screen.
const ForgotPasswordScreen = () => {
  const { t } = useTranslation();
  const theme = useAppTheme();
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
  // spinner with its own wrapper — the pending frame used to shift
  // depending on which auth screen you were on.
  if (requestReset.isPending) {
    return <FullScreenLoader />;
  }

  return (
    <>
      <AuthShell
        title={t(
          sent
            ? Translations.AUTH_FORGOT_SENT_TITLE
            : Translations.AUTH_FORGOT_TITLE,
        )}
        subtitle={t(
          sent
            ? Translations.AUTH_FORGOT_SENT_BODY
            : Translations.AUTH_FORGOT_SUBTITLE,
        )}
        footer={
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="link"
            accessibilityLabel={t(Translations.AUTH_FORGOT_BACK)}
            hitSlop={{
              top: Layout.HIT_SLOP_TEXT,
              bottom: Layout.HIT_SLOP_TEXT,
              left: Layout.HIT_SLOP,
              right: Layout.HIT_SLOP,
            }}
          >
            <AppText
              variant="body"
              style={{
                color: theme.colors.primary,
              }}
            >
              {t(Translations.AUTH_FORGOT_BACK)}
            </AppText>
          </Pressable>
        }
      >
        {sent ? (
          // The form is gone, not disabled: there is nothing left to do on
          // this screen and leaving a dead field behind invites a second
          // submit that would only send a second email.
          <View
            style={[
              styles.sentWell,
              {
                backgroundColor: theme.colors.surfaceSelected,
                borderColor: theme.colors.outlineSelected,
              },
            ]}
          >
            <MaterialCommunityIcons
              importantForAccessibility="no"
              accessibilityElementsHidden
              name="email-check-outline"
              size={40}
              color={theme.colors.primary}
            />
          </View>
        ) : (
          <>
            <FormProvider {...form}>
              <InputField<ForgotFormData>
                name="email"
                icon="email-outline"
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

            <GradientButton size="xl" onPress={onSubmit} disabled={!isValid}>
              {t(Translations.AUTH_FORGOT_SEND)}
            </GradientButton>
          </>
        )}
      </AuthShell>

      {/* CustomModal already centres its children, so the wrapper only
          repeated what the modal does. */}
      <CustomModal {...modalProps} onDismiss={closeModal}>
        <AppText
          variant="body"
          style={[
            styles.modalText,
            {
              color: theme.colors.error,
            },
          ]}
        >
          {modalMessage || t(Translations.AUTH_ERROR_FALLBACK)}
        </AppText>
        <Spacer spacing={Spacing.lg} />
        <AppButton variant="primary" onPress={closeModal}>
          {t(Translations.AUTH_DISMISS)}
        </AppButton>
      </CustomModal>
    </>
  );
};

export default ForgotPasswordScreen;

const styles = StyleSheet.create({
  sentWell: {
    alignSelf: 'center',
    width: Layout.GLOW_SIZE / 4,
    height: Layout.GLOW_SIZE / 4,
    borderRadius: Layout.GLOW_SIZE / 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalText: {
    textAlign: 'center',
  },
});
