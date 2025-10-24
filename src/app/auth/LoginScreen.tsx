import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { FormProvider, useForm } from 'react-hook-form';
import {
  Button,
  Text,
} from 'react-native-paper';

import BottomButton from '@components/BottomButton';

import { Spacing } from '@theme/constants/Spacing';
import { Translations } from '@modules/auth/i18n/translationKeys';
import Spacer from '@components/Spacer';
import Container from '@components/Container';
import { InputField } from '@components/InputField';
type LoginFormData = {
  email: string;
  password: string;
};

const LoginScreen = () => {
  const { t } = useTranslation();
  const form = useForm<LoginFormData>({
    defaultValues: {
      email: '',
      password: '',
    },
  });
  const {handleSubmit, } = form;
  const onSubmit = (data: LoginFormData) => {
    console.log(data);
  };

  return (
      <Container>
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
          onPress={handleSubmit(onSubmit)}
        />
        <Spacer spacing={Spacing.SPACING_PADDING_8} />
        <Button
          mode="outlined"
          style={{ width: '100%' }}
          onPress={() => {
            router.push('/auth/RegisterScreen');
          }}
        >
          Register
        </Button>
      </Container>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  logoWrap: {
    alignItems: 'center',
  },
  form: {
    width: '100%',
    maxWidth: 360,
  },
  input: {
    backgroundColor: 'transparent',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
