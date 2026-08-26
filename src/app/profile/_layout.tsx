import React from 'react';
import { Stack } from 'expo-router';

import ScreenSafeArea from '@shared/components/ScreenSafeArea';

// Covers /profile/edit and /profile/[userId]. Same reason as the auth
// layout: the inset lives per-screen now, and both of these want it.
export default function ProfileDetailLayout() {
  return (
    <ScreenSafeArea>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      />
    </ScreenSafeArea>
  );
}
