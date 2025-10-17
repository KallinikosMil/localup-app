import { StyleSheet, View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import { useThemeMode } from '@theme/ThemeModeProvider';
import { Spacing } from '@theme/constants/Spacing';
import BottomButton from '@components/BottomButton';

const LoginScreen = () => {
  const theme = useTheme();
  const { mode, setMode } = useThemeMode();

  return (
    <SafeAreaView
      style={[
        styles.safe,
        { backgroundColor: theme.colors.background },
      ]}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={styles.logoWrap}>
          <Text variant="titleLarge">LocalUp</Text>
        </View>
        <View style={styles.form}>
          <TextInput
            label="Email"
            mode="outlined"
            dense
            autoCapitalize="none"
            keyboardType="email-address"
            returnKeyType="next"
          />
          <TextInput
            label="Password"
            mode="outlined"
            dense
            secureTextEntry
            returnKeyType="done"
          />
        </View>
        <BottomButton text="Login" onPress={() => {}} />
      </ScrollView>
    </SafeAreaView>
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
  inputContent: {},
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
