import React, { useState } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FormProvider, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';

import AppText from '@shared/components/AppText';
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
  const insets = useSafeAreaInsets();
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
          <AppText variant="h1" style={{ color: theme.colors.onBackground }}>
            {t(Translations.AUTH_RESET_TITLE)}
          </AppText>
          <Spacer spacing={Spacing.SPACING_PADDING_8} />
          <AppText
            variant="body"
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            {t(Translations.AUTH_RESET_SUBTITLE)}
          </AppText>

          <Spacer spacing={Spacing.SPACING_PADDING_24} />

          <FormProvider {...form}>
            <InputField<ResetFormData>
              name="password"
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

            <Spacer spacing={Spacing.SPACING_PADDING_16} />

            <InputField<ResetFormData>
              name="confirmPassword"
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

          <Spacer spacing={Spacing.SPACING_PADDING_24} />

          <AppButton variant="primary" onPress={onSubmit} disabled={!isValid}>
            {t(Translations.AUTH_RESET_SUBMIT)}
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

export default ResetPasswordScreen;

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.SPACING_PADDING_24,
  },
});
