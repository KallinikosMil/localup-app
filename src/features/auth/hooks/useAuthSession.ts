import { useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@config/supabase';
import { store } from '@store';
import {
  setAuthError,
  setInitialized,
  setOnboardingComplete,
  setUser,
} from '@features/auth/slices/authSlice';

const toAuthUser = (session: Session | null) =>
  session?.user
    ? {
        uid: session.user.id,
        email: session.user.email ?? null,
      }
    : null;

// The profile read is the one thing standing between the user and the
// app, so give a transient blip a couple of chances before we surface
// the error screen.
const PROFILE_READ_BACKOFF_MS = [400, 1200];

const sleep = (ms: number) =>
  new Promise<void>(resolve => setTimeout(resolve, ms));

// The auth event that started a fetch may be obsolete by the time it
// resolves (logout, or logout → login as someone else, while A's read
// is in flight). Whatever the store says NOW is the truth; anything
// else must be dropped rather than applied to the wrong user.
const isStale = (userId: string) => store.getState().auth.user?.uid !== userId;

// Reads the onboarding flag for the signed-in user and pushes it into
// the store. Shared by both paths below so cold-start and live auth
// events can't drift apart.
//
// W13: a FAILED read must never become `false`. It used to — and that
// routed an already-onboarded user into onboarding, where finishing it
// upserts over their display_name / bio / home_city / avatar_url. A
// transient error was destructive. Now: retry, then an explicit error
// state; `onboardingComplete` stays `null` (unknown) throughout.
const syncOnboardingStatus = async (session: Session | null) => {
  if (!session?.user) {
    // "No user" ≠ "a user who hasn't onboarded". Unknown, not false.
    store.dispatch(setOnboardingComplete(null));
    return;
  }

  const userId = session.user.id;

  for (let attempt = 0; ; attempt++) {
    // maybeSingle, NOT single: `single()` reports "0 rows" as an ERROR
    // (PGRST116), which we could no longer tell apart from a real
    // failure. A brand-new user legitimately has no profile row yet —
    // that's data:null / error:null here, i.e. "not onboarded" (false).
    // Anything in `error` is now a genuine failure.
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('onboarding_complete')
      .eq('user_id', userId)
      .maybeSingle();

    if (isStale(userId)) return;

    if (!error) {
      store.dispatch(setAuthError(false));
      store.dispatch(
        setOnboardingComplete(profile?.onboarding_complete ?? false),
      );
      return;
    }

    if (attempt >= PROFILE_READ_BACKOFF_MS.length) {
      // Out of retries. Explicit error state → AppGuard shows Retry.
      // onboardingComplete stays null; we still do not know.
      store.dispatch(setAuthError(true));
      return;
    }

    await sleep(PROFILE_READ_BACKOFF_MS[attempt]);
    if (isStale(userId)) return;
  }
};

// Cold-start (and Retry) bootstrap: restore the persisted session and
// resolve the onboarding status for it.
const bootstrapAuth = async () => {
  try {
    const { data, error } = await supabase.auth.getSession();

    // W12: ANY getSession error means the persisted session is unusable
    // (most often a rotated single-use refresh token). We used to branch
    // on the error *text* (/refresh token/i) — error messages are not an
    // API contract, so that silently missed every other failure — and,
    // worse, we then read `data.session` anyway, so a stale session could
    // still be adopted and the auto-refresh loop kept retrying a dead
    // token. Treat any error as "no session": clear it locally and null
    // it out so it cannot be read below. The user lands on login.
    let session = data?.session ?? null;
    if (error) {
      try {
        await supabase.auth.signOut({ scope: 'local' });
      } catch {
        // best-effort cleanup
      }
      session = null;
    }

    store.dispatch(setUser(toAuthUser(session)));
    await syncOnboardingStatus(session);
  } catch {
    // getSession itself threw (the global fetch timeout now turns a hang
    // into a throw). We know nothing — say so, don't guess.
    store.dispatch(setAuthError(true));
  } finally {
    // Whatever happened above, AppGuard must be allowed to route. A throw
    // before this line used to leave `initialized: false` FOREVER → the
    // guard never routed → the app hung on the pre-init screen.
    store.dispatch(setInitialized(true));
  }
};

// Clears the error and re-runs the bootstrap. Wired to the Retry button
// on AppGuard's error screen. Module-level (not returned from the hook)
// because the whole session layer talks to the store directly — it lives
// above the Redux Provider.
export const retryAuthBootstrap = async () => {
  store.dispatch(setAuthError(false));
  await bootstrapAuth();
};

// Owns the Supabase auth session: restores it on cold start and keeps the
// store in sync with live auth events.
export const useAuthSession = () => {
  useEffect(() => {
    // Floating on purpose (an effect can't be async), but it can no
    // longer strand the app: bootstrapAuth swallows and finalises.
    void bootstrapAuth();

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      // INITIAL_SESSION is exactly what bootstrapAuth already did.
      if (event === 'INITIAL_SESSION') return;

      // The session Supabase hands us IS the source of truth (null on
      // sign-out), so there's nothing to error-check here. setUser is
      // synchronous and touches no network — safe inside the callback.
      store.dispatch(setUser(toAuthUser(session)));

      // Supabase holds the auth lock while this callback runs, and
      // `supabase.from(...)` re-enters it — awaiting Supabase calls in
      // here is documented as deadlock-prone. Defer the async work to a
      // fresh macrotask so the lock is released first.
      setTimeout(() => {
        void syncOnboardingStatus(session);
      }, 0);
    });

    return () => {
      sub?.subscription.unsubscribe();
    };
  }, []);
};
