import { useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';
import { isAuthRetryableFetchError } from '@supabase/supabase-js';
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

// TRANSPORT failure ≠ AUTH failure.
//
// "I couldn't reach the auth server" says NOTHING about whether the
// session is valid — it says we don't know. "The server answered and
// rejected the token" says the session is dead. Only the second one may
// destroy state.
//
// auth-js draws exactly this line for itself: `_callRefreshToken` calls
// `_removeSession()` on an auth error but deliberately SKIPS it when
// `isAuthRetryableFetchError(error)` is true. We reuse its own predicate
// so our verdict can't drift from the library's.
//
// It covers every fetch rejection (offline, DNS, dead socket — and our
// own 15s timeout abort, which `_handleRequest` catches and re-wraps as
// AuthRetryableFetchError) plus 502/503/504. `isAuthRetryableFetchError`
// is a documented export of @supabase/auth-js and is re-exported by
// @supabase/supabase-js (`export * from '@supabase/auth-js'`).
const isTransportFailure = (error: unknown) => {
  if (isAuthRetryableFetchError(error)) return true;

  // Belt and braces, for an abort that escapes before auth-js can wrap
  // it. `name` is a structured field, not prose — we still never branch
  // on error message text (that was the W12 bug).
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { name?: unknown }).name === 'AbortError'
  );
};

// Cold-start (and Retry) bootstrap: restore the persisted session and
// resolve the onboarding status for it.
const bootstrapAuth = async () => {
  try {
    const { data, error } = await supabase.auth.getSession();

    // W12: an AUTH error from getSession means the persisted session is
    // unusable (most often a rotated single-use refresh token). We used
    // to branch on the error *text* (/refresh token/i) — error messages
    // are not an API contract — and we then read `data.session` anyway,
    // so a dead session could still be adopted. So: clear it locally and
    // null it out. The user lands on login. That much still holds.
    //
    // H1b: but "any error" was too wide. Adding the global 15s fetch
    // timeout made a *transport* failure surface as an error too, so an
    // offline-but-perfectly-valid user was getting force-signed-out and
    // dumped on the login screen. Inferring dead-session from an
    // unreachable server is the exact anti-pattern W13 banned. On a
    // transport failure we now change NOTHING: no signOut, no session
    // wipe, no `user` write. Just say we don't know — AppGuard shows the
    // retryable error screen and holds the frame until Retry (or the
    // network) resolves it.
    let session = data?.session ?? null;
    if (error) {
      if (isTransportFailure(error)) {
        store.dispatch(setAuthError(true));
        return;
      }

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
    // getSession itself threw rather than returning an error. auth-js
    // only re-throws what it could NOT classify as an auth failure, so
    // this is by construction the "we know nothing" branch: never sign
    // out here either — just surface it as retryable.
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
