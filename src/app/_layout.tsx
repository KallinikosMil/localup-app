import React from 'react';
import { Slot } from 'expo-router';
import AppProviders from '../modules/core/AppProviders';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <AppProviders>
        <Slot />
    </AppProviders>
  );
}
