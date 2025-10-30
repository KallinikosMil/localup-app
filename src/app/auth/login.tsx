import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { StyleSheet, View } from 'react-native';
import {
  ActivityIndicator,
  Button,
  Text,
} from 'react-native-paper';
import { useTheme } from 'react-native-paper';
import { FormProvider, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { router } from 'expo-router';
import type { RootState, AppDispatch } from '@store';
import {
  resetState,
  loginUser,
} from '@features/auth/slices/authSlice';
import useModal from '@shared/hooks/useModal';

import Container from '@shared/components/Container';
import Spacer from '@shared/components/Spacer';
import BottomButton from '@shared/components/BottomButton';
import InputField from '@shared/components/InputField';
import CustomModal from '@shared/components/CustomModal';
import { RequestStatus } from '@shared/types/RequestStatus';

import { Spacing } from '@theme/constants/Spacing';
import { Translations } from '@features/auth/i18n/translationKeys';

type LoginFormData = {
  email: string;
  password: string;
};

const LoginScreen = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { t } = useTranslation();
  const theme = useTheme();
  const { status, error } = useSelector(
    (root: RootState) => root.auth,
  );
  const { modalProps, openModal, closeModal } = useModal();
  const [modalMessage, setModalMessage] =
    useState<string>('');
  const lastErrorRef = useRef<string | null>(null);

  const form = useForm<LoginFormData>({
    defaultValues: { email: '', password: '' },
    mode: 'onBlur',
    reValidateMode: 'onBlur',
  });

  const {
    handleSubmit,
    formState: { isValid },
  } = form;

  useEffect(() => {
    if (status === RequestStatus.ERROR && error) {
      if (error !== lastErrorRef.current) {
        setModalMessage(error);
        openModal();
      }
      lastErrorRef.current = error;
    } else {
      lastErrorRef.current = null;
      closeModal();
    }
  }, [status, error, openModal, closeModal]);

  const handleDismiss = useCallback(() => {
    dispatch(resetState());
    closeModal();
  }, [closeModal, dispatch]);

  const onSubmit = handleSubmit(({ email, password }) => {
    dispatch(loginUser({ email: email.trim(), password }));
  });

  const isLoading = status === RequestStatus.LOADING;

  return (
    <>
      <Container>
        {isLoading ? (
          <ActivityIndicator animating />
        ) : (
          <>
            <View style={styles.logoWrap}>
              <Text variant="titleLarge">
                {t(Translations.AUTH_HEADER_TEXT)}
              </Text>
            </View>
            <Spacer spacing={Spacing.SPACING_PADDING_8} />
            <View style={styles.form}>
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
                      message: 'Please enter your password',
                    },
                  }}
                  dense
                  secureTextEntry
                  returnKeyType="done"
                />
              </FormProvider>
            </View>
            <BottomButton
              label={t(Translations.AUTH_LOGIN_BUTTON)}
              onPress={onSubmit}
              disabled={isLoading || !isValid}
            />
            <Spacer spacing={Spacing.SPACING_PADDING_8} />
            <Button
              mode="outlined"
              style={{ width: '100%' }}
              onPress={() => router.push('/auth/register')}
              disabled={isLoading}
            >
              Register
            </Button>
          </>
        )}
      </Container>
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
          <Spacer spacing={Spacing.SPACING_PADDING_16} />
          <Button
            mode="contained"
            onPress={handleDismiss}
            style={styles.modalButton}
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
  safe: { flex: 1 },
  logoWrap: { alignItems: 'center' },
  form: { width: '100%', maxWidth: 360 },
  input: { backgroundColor: 'transparent' },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalContent: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 16,
  },
  modalButton: {
    alignSelf: 'center',
  },
});
