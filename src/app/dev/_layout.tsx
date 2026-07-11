import React from 'react';
import { Stack } from 'expo-router';
import { OnboardingProvider } from '@features/onboarding/context/OnboardingContext';

export default function DevLayout() {
  return (
    <OnboardingProvider>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      />
    </OnboardingProvider>
  );
}
