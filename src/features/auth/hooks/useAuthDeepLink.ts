import { useEffect } from 'react';
import * as Linking from 'expo-linking';

import { supabase } from '@config/supabase';
import { store } from '@store';
import { invalidateAuthBootstrap } from '@features/auth/hooks/useAuthSession';
import { setPasswordRecovery } from '@features/auth/slices/authSlice';

// Turns an incoming auth deep link into a session.
//
// On the web, `detectSessionInUrl` makes supabase-js read the tokens out
// of the URL by itself and emit PASSWORD_RECOVERY. React Native has no
// such thing — the option is off (correctly), so WITHOUT this hook the
// recovery link opens the app and nothing happens at all: the tokens
// arrive in the URL and no one reads them. Every screen of the recovery
// flow can be perfect and the feature is still dead.
//
// Handles both shapes Supabase can send back:
//   implicit → #access_token=…&refresh_token=…&type=recovery
//   PKCE     → ?code=…
// and the failure shape (…error=access_denied&error_code=otp_expired),
// which is what an expired or already-used link looks like.

type Parsed = Record<string, string>;

const parseParams = (url: string): Parsed => {
  const out: Parsed = {};
  // Everything after ? or #, whichever comes first. Supabase uses the
  // fragment for the implicit flow and the query for PKCE, and Expo Go
  // wraps the whole thing behind /--/ without changing either.
  const marker = url.search(/[?#]/);
  if (marker === -1) return out;
  for (const part of url.slice(marker + 1).split(/[&#]/)) {
    const [k, v] = part.split('=');
    if (k && v !== undefined)
      out[decodeURIComponent(k)] = decodeURIComponent(v);
  }
  return out;
};

const handleUrl = async (url: string | null) => {
  if (!url) return;
  const p = parseParams(url);
  if (__DEV__) {
    // The URL a deep link ACTUALLY delivers is the whole game here —
    // Expo Go rewrites links through /--/ and it is not obvious whether
    // the fragment survives. Keys only, never the token values.
    console.log('[auth] deep link', {
      head: url.slice(0, 60),
      keys: Object.keys(p),
    });
  }

  // An expired or reused link. Nothing to do beyond not pretending it
  // worked — AppGuard leaves the user on login, where they can request a
  // fresh one.
  if (p.error || p.error_code) {
    if (__DEV__) {
      console.log('[auth] recovery link rejected', {
        error: p.error,
        code: p.error_code,
      });
    }
    return;
  }

  const isRecovery = p.type === 'recovery';
  const hasTokens = !!(p.access_token && p.refresh_token);
  const hasCode = !!p.code;

  // Decide this BEFORE touching the bootstrap. Every link the app opens
  // arrives here, not just auth ones — the dev-client launcher URL, and
  // (more importantly) every tap on a push notification, which carries a
  // matchId and no credentials. Invalidating first and checking after
  // meant any of those discarded the restored session and dumped a
  // signed-in user back on the login screen, with nothing in the log to
  // say why. That was the unexplained ejection.
  if (!hasTokens && !hasCode) return;

  // Announce BEFORE writing the session: the cold-start bootstrap may
  // already be mid-read of the persisted one, and it must discard that
  // result rather than write the previous user back over this link.
  invalidateAuthBootstrap();

  if (hasTokens) {
    const { error } = await supabase.auth.setSession({
      access_token: p.access_token,
      refresh_token: p.refresh_token,
    });
    if (error) return;
  } else {
    const { error } = await supabase.auth.exchangeCodeForSession(p.code);
    if (error) return;
  }

  // setSession/exchangeCode emit SIGNED_IN, never PASSWORD_RECOVERY —
  // that event only exists on the web path. So the intent has to be
  // carried from the link itself, and it must be set AFTER the session
  // lands, because setUser clears the flag on an identity change.
  if (isRecovery) {
    store.dispatch(setPasswordRecovery(true));
  }
};

export const useAuthDeepLink = () => {
  useEffect(() => {
    // Cold start: the link that launched the app.
    void Linking.getInitialURL().then(handleUrl);
    // Warm start: the app was already running.
    const sub = Linking.addEventListener('url', ({ url }) => {
      void handleUrl(url);
    });
    return () => sub.remove();
  }, []);
};
