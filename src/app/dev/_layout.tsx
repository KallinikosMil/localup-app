import React from 'react';
import { Stack } from 'expo-router';

import ScreenSafeArea from '@shared/components/ScreenSafeArea';
import { OnboardingProvider } from '@features/onboarding/context/OnboardingContext';

export default function DevLayout() {
  return (
    <OnboardingProvider>
      {/* Same reason as the onboarding layout: the inset lives per-screen
          now, and the gallery's routes all want it. */}
      <ScreenSafeArea>
        <Stack
          screenOptions={{
            headerShown: false,
          }}
        />
      </ScreenSafeArea>
    </OnboardingProvider>
  );
}
