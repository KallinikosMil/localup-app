import React from 'react';
import { Slot } from 'expo-router';
import AppProviders from '../modules/core/AppProviders';

export default function RootLayout() {
  return (
    <AppProviders>
      <Slot />
    </AppProviders>
  );
}
