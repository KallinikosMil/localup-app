import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useSelector } from 'react-redux';
import type { RootState } from '../../modules/core/store';

export default function CoreScreen() {
  const { isAuthed, initialized } = useSelector((s: RootState) => s.auth);

  if (!initialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return <Redirect href={isAuthed ? '/dashboard' : '/auth/login'} />;
}
