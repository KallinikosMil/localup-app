import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  usePathname,
  useRootNavigationState,
  useRouter,
  useSegments,
} from 'expo-router';
import { useTranslation } from 'react-i18next';

import AuthErrorScreen from '@features/auth/components/AuthErrorScreen';
import FullScreenLoader from '@shared/components/FullScreenLoader';
import { RootState } from '@store';
import { Translations } from '@shared/i18n/translationKeys';

export default function AppGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const pathname = usePathname();
  // undefined until the root <Stack> has actually mounted. Navigating before
  // that throws "Attempted to navigate before mounting the Root Layout
  // component" — which is exactly what happens on a cold start with NO
  // session: the routing effect below wants to replace() to /auth/login on
  // the very first commit, before the navigator this component sits inside
  // has finished rendering. It surfaced only after a data wipe, because
  // every other start had a session to restore and took a slower path.
  const rootNavigationState = useRootNavigationState();
  const navigatorReady = !!rootNavigationState?.key;
  const { t } = useTranslation();
  const { user, initialized, onboardingComplete, authError, passwordRecovery } =
    useSelector((s: RootState) => s.auth);

  // The bootstrap tolerates a Supabase project waking from auto-pause: the
  // profile read gets 15s per attempt plus two backoff retries, so a cold
  // start can legitimately take ~45s. Shortening that budget would turn
  // slow-but-fine wakes into false failures — the actual problem was that
  // those 45s were an unlabelled spinner. Say what's happening instead,
  // matching what chat/matches/profile already do at 4.5s.
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (initialized) {
      setSlow(false);
      return;
    }
    const timer = setTimeout(() => setSlow(true), 4500);
    return () => clearTimeout(timer);
  }, [initialized]);

  useEffect(() => {
    // Nothing may route until there is a navigator to route in.
    if (!navigatorReady) return;
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
    const onResetScreen = pathname === '/auth/reset-password';

    if (inDev) return;

    // A recovery link SIGNS THE USER IN, so every rule below would treat
    // them as a normal authenticated user and send them to Discover —
    // the reset screen would be unreachable and the emailed link would
    // look broken. Hold them here until the password is actually changed
    // (useUpdatePassword clears the flag), then the rules resume.
    if (passwordRecovery) {
      if (!onResetScreen) router.replace('/auth/reset-password');
      return;
    }

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
  }, [
    navigatorReady,
    initialized,
    authError,
    user,
    onboardingComplete,
    passwordRecovery,
    pathname,
    segments,
  ]);

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
  if (!initialized)
    return (
      <FullScreenLoader
        message={slow ? t(Translations.COMMON_WAKING) : undefined}
      />
    );
  // Password recovery outranks both gates below. The profile read is
  // still in flight (or may even have failed) while the user is standing
  // on the reset screen — neither an unknown status nor a failed read
  // should stop them setting a new password, which is the one thing they
  // came here to do.
  if (passwordRecovery) return <>{children}</>;
  // Same tightening as the routing effect: the error screen may only
  // take the frame when we genuinely do not know the account state.
  // Unconditionally, it meant one failed profile read mid-session
  // unmounted the entire running app.
  if (authError && onboardingComplete === null) return <AuthErrorScreen />;
  if (user && onboardingComplete === null) return <FullScreenLoader />;

  return <>{children}</>;
}
