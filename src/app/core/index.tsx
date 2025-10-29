import React from 'react';
import { ActivityIndicator, View, Text } from 'react-native';
import { useSelector } from 'react-redux';
import { useRouter } from 'expo-router';
import type { RootState } from '@store';

export default function CoreScreen() {
  const router = useRouter();
  const { user, initialized } = useSelector((s: RootState) => s.auth);

  console.log('🔥 CoreScreen render:', { initialized, user });

  React.useEffect(() => {
    console.log('🌀 useEffect triggered:', { initialized, user });

    if (!initialized) return;

    if (user) {
      console.log('✅ Redirecting to /dashboard');
      router.replace('/dashboard');
    } else {
      console.log('🚪 Redirecting to /auth/login');
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
