import React from 'react';
import { ActivityIndicator, View, Text } from 'react-native';
import { useSelector } from 'react-redux';
import { useRouter } from 'expo-router';
import type { RootState } from '@store';

export default function CoreScreen() {
  const router = useRouter();
  const { user, initialized } = useSelector((s: RootState) => s.auth);

  React.useEffect(() => {
    if (!initialized) return;
    if (user) {
      router.replace('/dashboard');
    } else {
      router.replace('/auth/login');
    }
  }, [initialized, user]);

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <ActivityIndicator />
      <Text>CoreScreen</Text>
    </View>
  );
}
