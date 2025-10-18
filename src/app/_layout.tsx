import React from 'react';
import { Slot } from 'expo-router';
import '../src/app/core/i18n';            // ensure init even if tree-shaken
import AppProviders from './core/AppProviders';

export default function RootLayout() {
  return (
    <AppProviders>
      <Slot />  {/* file-based routes render here */}
    </AppProviders>
  );
}
