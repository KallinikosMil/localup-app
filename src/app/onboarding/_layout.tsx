import React from 'react';
import { Stack } from 'expo-router';

import ScreenSafeArea from '@shared/components/ScreenSafeArea';
import { OnboardingProvider } from '@features/onboarding/context/OnboardingContext';

export default function OnboardingLayout() {
  return (
    <OnboardingProvider>
      {/* The app-level SafeAreaView is gone (see Shell) so the redesign's
          full-bleed screens can reach the edges. Onboarding still wants
          the inset, and taking it here covers all four steps at once. */}
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
