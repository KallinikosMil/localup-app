import { View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '@store';
import { logoutUser } from '@features/auth/slices/authSlice';
import { RequestStatus } from '@shared/types/RequestStatus';

const DashboardScreen = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { status } = useSelector(
    (s: RootState) => s.auth,
  );

  const onLogout = () => {
    dispatch(logoutUser());
  };

  return (
    <View>
      <Text>DashboardScreen</Text>
      <Button
        mode="outlined"
        onPress={onLogout}
        loading={status === RequestStatus.LOADING}
        disabled={status === RequestStatus.LOADING}
      >
        Logout
      </Button>
    </View>
  );
};

export default DashboardScreen;
