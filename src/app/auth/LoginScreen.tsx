import { StyleSheet, View, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  Text,
  TextInput,
} from 'react-native-paper';

import BottomButton from '@components/BottomButton';

import { Spacing } from '@theme/constants/Spacing';
import { Translations } from '@modules/auth/i18n/translationKeys';

const LoginScreen = () => {
  const { t } = useTranslation();

  return (
      <View
        style={styles.container}
      >
        <View style={styles.logoWrap}>
          <Text variant="titleLarge">
            {t(Translations.AUTH_HEADER_TEXT)}
          </Text>
        </View>
        <View style={styles.form}>
          <TextInput
            label={t(Translations.AUTH_EMAIL_LABEL)}
            mode="outlined"
            dense
            autoCapitalize="none"
            keyboardType="email-address"
            returnKeyType="next"
          />
          <TextInput
            label={t(Translations.AUTH_PASSWORD_LABEL)}
            mode="outlined"
            dense
            secureTextEntry
            returnKeyType="done"
          />
        </View>
        <BottomButton
          text={t(Translations.AUTH_LOGIN_BUTTON)}
          onPress={() => {}}
        />
      </View>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  container: {
    paddingTop: 60,
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.SPACING_PADDING_24,
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
