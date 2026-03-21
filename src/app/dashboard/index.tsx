import { View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import React from 'react';
import { useLogout } from '@features/auth/hooks/useAuth';

const DashboardScreen = () => {
  const logout = useLogout();

  return (
    <View>
      <Text>DashboardScreen</Text>
      <Button
        mode="outlined"
        onPress={() => logout.mutate()}
        loading={logout.isPending}
        disabled={logout.isPending}
      >
        Logout
      </Button>
    </View>
  );
};

export default DashboardScreen;
