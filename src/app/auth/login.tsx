import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  ActivityIndicator,
  Button,
  Text,
} from 'react-native-paper';
import { FormProvider, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { router } from 'expo-router';

import { loginUser } from '@modules/auth/slices/authSlice';
import type {
  RootState,
  AppDispatch,
} from '@modules/core/store';

import Container from '@components/Container';
import Spacer from '@components/Spacer';
import BottomButton from '@components/BottomButton';
import InputField from '@components/InputField';

import { Spacing } from '@theme/constants/Spacing';
import { Translations } from '@modules/auth/i18n/translationKeys';

type LoginFormData = {
  email: string;
  password: string;
};

const LoginScreen = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { t } = useTranslation();
  const { loading, error } = useSelector(
    (root: RootState) => root.auth,
  );

  const form = useForm<LoginFormData>({
    defaultValues: { email: '', password: '' },
    mode: 'onChange',
    reValidateMode: 'onChange',
  });

  const {
    handleSubmit,
    setError,
    formState: { isValid },
  } = form;

  useEffect(() => {
    if (error) setError('password', { message: error });
  }, [error, setError]);

  const onSubmit = handleSubmit(({ email, password }) => {
    dispatch(loginUser({ email: email.trim(), password }));
  });

  return (
    <Container>
      {loading ? (
        <ActivityIndicator animating={loading} />
      ) : (
        <>
          <View style={styles.logoWrap}>
            <Text variant="titleLarge">
              {t(Translations.AUTH_HEADER_TEXT)}
            </Text>
          </View>
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

              <Spacer spacing={Spacing.SPACING_PADDING_8} />

              <InputField
                name="password"
                label={t(Translations.AUTH_PASSWORD_LABEL)}
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
            disabled={loading || !isValid}
          />
          <Spacer spacing={Spacing.SPACING_PADDING_8} />
          <Button
            mode="outlined"
            style={{ width: '100%' }}
            onPress={() => router.push('/auth/register')}
            disabled={loading}
          >
            Register
          </Button>
        </>
      )}
    </Container>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  safe: { flex: 1 },
  logoWrap: { alignItems: 'center' },
  form: { width: '100%', maxWidth: 360 },
  input: { backgroundColor: 'transparent' },
  switchRow: { flexDirection: 'row', alignItems: 'center' },
});
