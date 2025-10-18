import React from 'react';
import { Slot } from 'expo-router';
import AppProviders from './core/AppProviders';

export default function RootLayout() {
  return (
    <AppProviders>
      <Slot />
    </AppProviders>
  );
}
