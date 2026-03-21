import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  ActivityIndicator,
  Button,
  Text,
  useTheme,
} from 'react-native-paper';
import { router } from 'expo-router';
import {
  useForm,
  FormProvider,
} from 'react-hook-form';
import { useRegister } from '@features/auth/hooks/useAuth';

import Spacer from '@shared/components/Spacer';
import PressableIcon from '@shared/components/PressableIcon';
import InputField from '@shared/components/InputField';
import CustomModal from '@shared/components/CustomModal';
import useModal from '@shared/hooks/useModal';

import { Spacing } from '@theme/constants/Spacing';

type RegisterFormData = {
  email: string;
  password: string;
  confirmPassword: string;
};

const RegisterScreen = () => {
  const form = useForm<RegisterFormData>({
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
    },
  });
  const {
    handleSubmit,
    formState: { isValid },
  } = form;
  const register = useRegister();
  const [modalMessage, setModalMessage] =
    useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const theme = useTheme();
  const { openModal, closeModal, modalProps } =
    useModal();

  const onSubmit = (data: RegisterFormData) => {
    register.mutate(
      {
        email: data.email,
        password: data.password,
      },
      {
        onSuccess: () => {
          setIsSuccess(true);
          setModalMessage(
            'Confirmation mail sent, check your inbox!',
          );
          openModal();
        },
        onError: err => {
          setIsSuccess(false);
          setModalMessage(
            err instanceof Error
              ? err.message
              : 'Register failed',
          );
          openModal();
        },
      },
    );
  };

  const handleDismiss = () => {
    register.reset();
    closeModal();
  };

  return (
    <>
      {register.isPending ? (
        <ActivityIndicator animating />
      ) : (
        <>
          <PressableIcon
            onPress={() => router.back()}
          />
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
                    value:
                      /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message:
                      'Invalid email address',
                  },
                }}
              />

              <Spacer
                spacing={Spacing.SPACING_PADDING_8}
              />

              <InputField
                name="password"
                label="Password"
                secureTextEntry
                rules={{
                  required: {
                    value: true,
                    message:
                      'Password is required',
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

              <Spacer
                spacing={Spacing.SPACING_PADDING_8}
              />

              <InputField
                name="confirmPassword"
                label="Confirm Password"
                secureTextEntry
                rules={{
                  required: {
                    value: true,
                    message:
                      'Please confirm your password',
                  },
                  validate: value =>
                    value ===
                      form.getValues('password') ||
                    'Passwords do not match',
                  deps: ['password'],
                }}
              />
              <Spacer
                spacing={Spacing.SPACING_PADDING_8}
              />
            </View>
            <Button
              mode="contained"
              onPress={handleSubmit(onSubmit)}
              style={{ width: '100%' }}
              disabled={
                register.isPending || !isValid
              }
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
              color: isSuccess
                ? theme.colors.primary
                : theme.colors.error,
            }}
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
