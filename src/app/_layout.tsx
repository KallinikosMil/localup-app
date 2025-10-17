import React from 'react';
import { ThemeModeProvider } from '@theme/ThemeModeProvider';
import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <ThemeModeProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </ThemeModeProvider>
  );
}
