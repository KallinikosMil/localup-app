import React from 'react';
import { Slot } from 'expo-router';
import AppProviders from '../modules/core/AppProviders';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect } from 'react';
import { usePathname, useSegments } from 'expo-router';

export default function RootLayout() {
  return (
    <AppProviders>
        <Slot />
    </AppProviders>
  );
}
