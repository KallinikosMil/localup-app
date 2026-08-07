// Must stay the first import: it silences a warning that expo-notifications
// emits from its own module body, so it has to run before anything pulls
// that package in. See the file for why, and when to delete it.
import '@config/logbox';

import React from 'react';
import { Stack } from 'expo-router';

import AppProviders from '@providers/AppProviders';

export default function RootLayout() {
  return (
    <AppProviders>
      {/* Stack (not Slot) so pushing a detail route
          (e.g. /profile/edit) keeps the (tabs)
          navigator mounted — with Slot every push
          unmounted the tabs, so back() landed on
          the default tab and remounted every
          screen (P0 latency fix 2026-06-11). */}
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      />
    </AppProviders>
  );
}
