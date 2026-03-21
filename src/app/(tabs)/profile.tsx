import React from 'react';
import {
  View,
  StyleSheet,
} from 'react-native';
import { Button } from 'react-native-paper';
import AppText from
  '@shared/components/AppText';
import { useLogout } from
  '@features/auth/hooks/useAuth';

export default function ProfileScreen() {
  const logout = useLogout();

  return (
    <View style={styles.root}>
      <AppText variant="h2">
        Profile
      </AppText>
      <Button
        mode="outlined"
        onPress={() => logout.mutate()}
        loading={logout.isPending}
        disabled={logout.isPending}
        style={{ marginTop: 24 }}
      >
        Logout
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
