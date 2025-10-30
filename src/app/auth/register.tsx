import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';
import { StyleSheet, View } from 'react-native';
import {
  ActivityIndicator,
  Button,
  Text,
  useTheme,
} from 'react-native-paper';
import { router } from 'expo-router';
import { useForm, FormProvider } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';

import type { AppDispatch, RootState } from '@store';
import {
  registerUser,
  resetState,
} from '@features/auth/slices/authSlice';

import Spacer from '@shared/components/Spacer';
import PressableIcon from '@shared/components/PressableIcon';
import InputField from '@shared/components/InputField';

import { Spacing } from '@theme/constants/Spacing';
import { RequestStatus } from '@shared/types/RequestStatus';
import useModal from '@shared/hooks/useModal';
import CustomModal from '@shared/components/CustomModal';

type RegisterFormData = {
  email: string;
  password: string;
  confirmPassword: string;
};

type Props = {};

const RegisterScreen = (props: Props) => {
  const form = useForm<RegisterFormData>({
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
    },
  });
  const { handleSubmit, formState: { isValid } } = form;
  const dispatch = useDispatch<AppDispatch>();
  const { status, error } = useSelector(
    (root: RootState) => root.auth,
  );
  const [modalMessage, setModalMessage] =
    useState<string>('');
  const theme = useTheme();
  const isLoading = status === RequestStatus.LOADING;
  const onSubmit = (data: RegisterFormData) => {
    dispatch(
      registerUser({
        email: data.email,
        password: data.password,
      }),
    );
  };
  const { openModal, closeModal, modalProps } = useModal();

  const handleDismiss = useCallback(() => {
    dispatch(resetState());
    closeModal();
  }, [closeModal, dispatch]);

  useEffect(() => {
    if (status === RequestStatus.SUCCESS) {
      setModalMessage(
        'Confirmation mail sent, check your inbox!',
      );
      openModal();
      return;
    }

    if (status === RequestStatus.ERROR && error) {
      setModalMessage(error);
      openModal();
      return;
    }

    if (status === RequestStatus.IDLE) {
      closeModal();
    }
  }, [status, error, openModal, closeModal]);

  return (
    <>
      {isLoading ? (
        <ActivityIndicator animating />
      ) : (
        <>
          <PressableIcon onPress={() => router.back()} />
          <FormProvider {...form}>
            <View
              style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Text
                variant="headlineMedium"
                style={{ marginBottom: 24 }}
              >
                Create Account
              </Text>
              <InputField
                name="email"
                keyboardType="email-address"
                label="Email"
                rules={{
                  required: {
                    value: true,
                    message: 'Email is required',
                  },
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: 'Invalid email address',
                  },
                }}
              />

              <Spacer spacing={Spacing.SPACING_PADDING_8} />

              <InputField
                name="password"
                label="Password"
                secureTextEntry
                rules={{
                  required: {
                    value: true,
                    message: 'Password is required',
                  },
                  minLength: {
                    value: 8,
                    message:
                      'Password must be at least 8 characters',
                  },
                  pattern: {
                    value:
                      /^(?=.)(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
                    message:
                      'Must include upper, number & special character',
                  },
                }}
              />

              <Spacer spacing={Spacing.SPACING_PADDING_8} />

              <InputField
                name="confirmPassword"
                label="Confirm Password"
                secureTextEntry
                rules={{
                  required: {
                    value: true,
                    message: 'Please confirm your password',
                  },
                  validate: value =>
                    value === form.getValues('password') ||
                    'Passwords do not match',
                  deps: ['password'],
                }}
              />
              <Spacer spacing={Spacing.SPACING_PADDING_8} />
            </View>
            <Button
              mode="contained"
              onPress={handleSubmit(onSubmit)}
              style={{ width: '100%' }}
              disabled={isLoading || !isValid}
            >
              Register
            </Button>
          </FormProvider>
        </>
      )}
      <CustomModal
        {...modalProps}
        onDismiss={handleDismiss}
      >
        <View style={styles.modalContent}>
          <Text
            variant="bodyMedium"
            style={{
              color:
                status === RequestStatus.SUCCESS
                  ? theme.colors.primary
                  : theme.colors.error,
            }}
          >
            {modalMessage ||
              'Something went wrong. Please try again.'}
          </Text>
          <Spacer spacing={Spacing.SPACING_PADDING_16} />
          <Button
            mode="contained"
            onPress={handleDismiss}
            style={styles.modalButton}
            buttonColor={
              status === RequestStatus.SUCCESS
                ? theme.colors.primary
                : theme.colors.primary
            }
            textColor={theme.colors.onPrimary}
          >
            Dismiss
          </Button>
        </View>
      </CustomModal>
    </>
  );
};

export default RegisterScreen;

const styles = StyleSheet.create({
  modalContent: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 16,
  },
  modalButton: {
    alignSelf: 'center',
  },
});
