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
