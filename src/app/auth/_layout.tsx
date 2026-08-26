import React from 'react';
import { Stack } from 'expo-router';

import ScreenSafeArea from '@shared/components/ScreenSafeArea';

// The app-level SafeAreaView is gone (see Shell) so the redesign's
// full-bleed screens can reach the edges. The auth screens still want the
// inset, and a group layout takes it once for all four instead of
// wrapping each screen's root by hand.
export default function AuthLayout() {
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
