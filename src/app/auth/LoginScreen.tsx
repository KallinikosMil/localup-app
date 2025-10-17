import { StyleSheet, View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, TextInput, Button, useTheme, Switch } from 'react-native-paper';
import { useThemeMode } from '../_layout';

const LoginScreen = () => {
  const theme = useTheme();
  const { mode, setMode } = useThemeMode();

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: theme.colors.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View>
          <Text
            variant="titleLarge"
            style={{ color: theme.colors.onBackground }}
          >
            LocalUp
          </Text>
        </View>
        <View style={styles.form}>
          <TextInput
            label="Email"
            mode="outlined"
            style={styles.input}
            autoCapitalize="none"
            keyboardType="email-address"
            returnKeyType="next"
          />
          <TextInput
            label="Password"
            mode="outlined"
            secureTextEntry
            style={styles.input}
            returnKeyType="done"
          />
          <Button
            mode="contained"
            onPress={() => {
              /* TODO */
            }}
          >
            Login
          </Button>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ color: theme.colors.onBackground, marginRight: 8 }}>
            Dark mode
          </Text>
          <Switch
            value={mode === 'dark'}
            onValueChange={v => setMode(v ? 'dark' : 'light')}
          />
        </View>
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
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
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
    // marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    // marginTop: 16,
    marginVertical: 10,
  },
});
