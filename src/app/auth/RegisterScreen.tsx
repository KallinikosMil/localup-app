import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  Button,
  Text,
  useTheme,
} from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useForm, FormProvider } from 'react-hook-form';
import { InputField } from '@components/InputField';
import Spacer from '@components/Spacer';
import { Spacing } from '@theme/constants/Spacing';

type RegisterFormData = {
  email: string;
  password: string;
  confirmPassword: string;
};

type Props = {};

const RegisterScreen = (props: Props) => {
  const theme = useTheme();
  const form = useForm<RegisterFormData>({
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
    },
  });
  const { handleSubmit } = form;

  const onSubmit = (data: RegisterFormData) => {
    console.log('Form data:', data);
    // Handle registration logic here
  };
  return (
    <>
      <Pressable
        onPress={() => {
          router.back();
        }}
      >
        <Ionicons
          name="chevron-back-outline"
          size={32}
          color={theme.colors.primary}
        />
      </Pressable>
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
        >
          Register
        </Button>
      </FormProvider>
    </>
  );
};

export default RegisterScreen;

const styles = StyleSheet.create({});
