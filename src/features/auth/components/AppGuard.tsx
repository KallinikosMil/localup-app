import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useRouter, useSegments } from 'expo-router';
import { RootState } from '@store';
import AuthErrorScreen from '@features/auth/components/AuthErrorScreen';

// Auth-based routing: keeps unauthenticated users in /auth, routes
// authenticated ones to onboarding or the tabs depending on their
// onboarding status.
export default function AppGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const { user, initialized, onboardingComplete, authError } = useSelector(
    (s: RootState) => s.auth,
  );

  useEffect(() => {
    if (!initialized) return;

    // We don't know the account state (W13). Don't route on a guess —
    // the error screen below owns the frame until Retry resolves it.
    if (authError) return;

    const inAuthGroup = segments[0] === 'auth';
    const inOnboarding = segments[0] === 'onboarding';
    const inDev = __DEV__ && segments[0] === 'dev';

    if (inDev) return;

    // W5: onboarding status for this user isn't known yet (the
    // SIGNED_IN profile fetch is still in flight — onboardingComplete
    // is null). Don't route in/out of onboarding on a null; wait for a
    // real boolean. This closes the live-login window where the guard
    // briefly saw `user && !onboardingComplete` and flashed onboarding.
    if (user && onboardingComplete === null) {
      return;
    }

    if (!user && !inAuthGroup) {
      router.replace('/auth/login');
    } else if (user && inAuthGroup) {
      if (onboardingComplete) {
        router.replace('/(tabs)/discover');
      } else {
        router.replace('/onboarding/name-age');
      }
    } else if (user && !onboardingComplete && !inOnboarding) {
      router.replace('/onboarding/name-age');
    } else if (user && onboardingComplete && inOnboarding) {
      router.replace('/(tabs)/discover');
    }
  }, [initialized, authError, user, onboardingComplete, segments]);

  // Render NOTHING until we know where this user belongs. `app/index.ts`
  // redirects `/` → `/(tabs)/discover` unconditionally, so anything we
  // render before the session is resolved mounts the authed tabs — the
  // tab bar + Discover flash on every cold start, before login.
  // Order matters: not-initialised → unknown-account → unknown-status.
  if (!initialized) return null;
  if (authError) return <AuthErrorScreen />;
  if (user && onboardingComplete === null) return null;

  return <>{children}</>;
}
