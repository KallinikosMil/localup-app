import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useRouter, useSegments } from 'expo-router';
import { RootState } from '@store';
import AuthErrorScreen from '@features/auth/components/AuthErrorScreen';
import FullScreenLoader from '@shared/components/FullScreenLoader';

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
    //
    // Only when the status is genuinely UNKNOWN, though. A failed read
    // that happened while we already hold a boolean status (e.g. a blip
    // during a mid-session refresh) tells us nothing new: we still know
    // where this user belongs, so keep routing normally rather than
    // freezing a working session.
    if (authError && onboardingComplete === null) return;

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

  // Render NO CHILDREN until we know where this user belongs.
  // `app/index.ts` redirects `/` → `/(tabs)/discover` unconditionally, so
  // anything we render before the session is resolved mounts the authed
  // tabs — the tab bar + Discover flash on every cold start, before
  // login. The gates themselves are untouched (W5/W13): we still never
  // route on an unknown onboarding status, and authError still owns the
  // frame.
  //
  // V1: what changed is only the PIXELS. These two branches used to
  // render `null` — a blank frame wedged between the login screen's
  // spinner and the destination screen's spinner, so signing in looked
  // like two loaders with a flash of nothing in between. Same spinner in
  // every frame now (login.tsx renders the identical component), so the
  // handoff is seamless.
  // Order matters: not-initialised → unknown-account → unknown-status.
  if (!initialized) return <FullScreenLoader />;
  // Same tightening as the routing effect: the error screen may only
  // take the frame when we genuinely do not know the account state.
  // Unconditionally, it meant one failed profile read mid-session
  // unmounted the entire running app.
  if (authError && onboardingComplete === null) return <AuthErrorScreen />;
  if (user && onboardingComplete === null) return <FullScreenLoader />;

  return <>{children}</>;
}
