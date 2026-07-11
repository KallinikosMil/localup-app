import { useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@config/supabase';
import { store } from '@store';
import {
  setInitialized,
  setUser,
  setOnboardingComplete,
} from '@features/auth/slices/authSlice';

const toAuthUser = (session: Session | null) =>
  session?.user
    ? {
        uid: session.user.id,
        email: session.user.email ?? null,
      }
    : null;

// Reads the onboarding flag for the signed-in user and pushes it into the
// store. Shared by both paths below so cold-start and live auth events can't
// drift apart.
const syncOnboardingStatus = async (session: Session | null) => {
  if (!session?.user) {
    store.dispatch(setOnboardingComplete(false));
    return;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_complete')
    .eq('user_id', session.user.id)
    .single();

  store.dispatch(setOnboardingComplete(profile?.onboarding_complete ?? false));
};

// Owns the Supabase auth session: restores it on cold start and keeps the
// store in sync with live auth events.
export const useAuthSession = () => {
  useEffect(() => {
    const initSession = async () => {
      const { data, error } = await supabase.auth.getSession();

      // W12: ANY getSession error means the persisted session is unusable
      // (most often a rotated single-use refresh token). We used to branch on
      // the error *text* (/refresh token/i) — error messages are not an API
      // contract, so that silently missed every other failure — and, worse,
      // we then read `data.session` anyway, so a stale session could still be
      // adopted and the auto-refresh loop kept retrying a dead token. Treat
      // any error as "no session": clear it locally and null it out so it
      // cannot be read below. The user lands on login, as intended.
      let session = data.session;
      if (error) {
        try {
          await supabase.auth.signOut({ scope: 'local' });
        } catch {
          // best-effort cleanup
        }
        session = null;
      }

      store.dispatch(setUser(toAuthUser(session)));

      if (session?.user) {
        await syncOnboardingStatus(session);
      }

      store.dispatch(setInitialized(true));
    };

    initSession();

    const { data: sub } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        // Same shape as the cold-start path, minus the error handling: this
        // callback has no error argument — the session it hands us IS the
        // source of truth (null on sign-out). So there's nothing to string-
        // match here either. setUser resets onboardingComplete to unknown
        // (W5), so we always re-read it.
        store.dispatch(setUser(toAuthUser(session)));
        await syncOnboardingStatus(session);
      },
    );

    return () => {
      sub?.subscription.unsubscribe();
    };
  }, []);
};
