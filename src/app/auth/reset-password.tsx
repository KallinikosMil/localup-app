import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { useTheme } from 'react-native-paper';
import { FormProvider, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';

import AppText from '@shared/components/AppText';
import GradientButton from '@shared/components/GradientButton';
import AuthShell from '@features/auth/components/AuthShell';
import AppButton from '@shared/components/AppButton';
import FullScreenLoader from '@shared/components/FullScreenLoader';
import InputField from '@shared/components/InputField';
import Spacer from '@shared/components/Spacer';
import CustomModal from '@shared/components/CustomModal';
import useModal from '@shared/hooks/useModal';
import { useUpdatePassword, authErrorKey } from '@features/auth/hooks/useAuth';
import { setPasswordRecovery } from '@features/auth/slices/authSlice';
import { Translations } from '@features/auth/i18n/translationKeys';
import { Spacing } from '@theme/constants/Spacing';

type ResetFormData = {
  password: string;
  confirmPassword: string;
};

// Step 2 of password recovery. Reached ONLY through AppGuard, which
// routes here while `passwordRecovery` is set — the recovery link has
// already signed the user in, so this is a plain updateUser rather than
// a token exchange.
const ResetPasswordScreen = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const dispatch = useDispatch();
  const updatePassword = useUpdatePassword();
  const { modalProps, openModal, closeModal } = useModal();
  const [modalMessage, setModalMessage] = useState('');

  const form = useForm<ResetFormData>({
    defaultValues: { password: '', confirmPassword: '' },
    mode: 'onTouched',
  });

  const {
    handleSubmit,
    watch,
    formState: { isValid },
  } = form;

  const onSubmit = handleSubmit(({ password }) => {
    updatePassword.mutate(password, {
      // Clearing the flag is what releases AppGuard: the user is already
      // authenticated, so the normal rules take over and route them to
      // the deck (or onboarding). Only do it on SUCCESS — on failure they
      // must stay here and try again, not get dropped into the app with
      // the old password still in place.
      onSuccess: () => dispatch(setPasswordRecovery(false)),
      onError: err => {
        setModalMessage(t(authErrorKey(err)));
        openModal();
      },
    });
  });

  // The same loader the other auth screens use.
  if (updatePassword.isPending) {
    return <FullScreenLoader />;
  }

  return (
    <>
      <AuthShell
        title={t(Translations.AUTH_RESET_TITLE)}
        subtitle={t(Translations.AUTH_RESET_SUBTITLE)}
      >
        <FormProvider {...form}>
          <InputField<ResetFormData>
            name="password"
            icon="lock-outline"
            label={t(Translations.AUTH_RESET_NEW_PASSWORD)}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="new-password"
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
          />

          <InputField<ResetFormData>
            name="confirmPassword"
            icon="lock-check-outline"
            label={t(Translations.AUTH_CONFIRM_PASSWORD_LABEL)}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="new-password"
            returnKeyType="done"
            rules={{
              required: {
                value: true,
                message: t(Translations.AUTH_PASSWORD_REQUIRED),
              },
              validate: value =>
                value === watch('password') ||
                t(Translations.AUTH_PASSWORD_MISMATCH),
            }}
          />
        </FormProvider>

        <GradientButton size="xl" onPress={onSubmit} disabled={!isValid}>
          {t(Translations.AUTH_RESET_SUBMIT)}
        </GradientButton>
      </AuthShell>

      {/* CustomModal already centres its children, so the wrapper only
          repeated what the modal does. */}
      <CustomModal {...modalProps} onDismiss={closeModal}>
        <AppText
          variant="body"
          style={[styles.modalText, { color: theme.colors.error }]}
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

export default ResetPasswordScreen;

const styles = StyleSheet.create({
  modalText: {
    textAlign: 'center',
  },
});
