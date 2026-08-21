import { useMutation } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import { supabase } from '@config/supabase';
import { AuthErrorCode, AuthFailure } from '@features/auth/utils/authErrors';
import { invalidateAuthBootstrap } from '@features/auth/hooks/useAuthSession';

// Where Supabase sends the browser back to once Google has answered. It must
// also be listed under Authentication → URL Configuration → Redirect URLs in
// the Supabase dashboard, or the provider refuses to redirect at all.
export const googleRedirectTo = () => Linking.createURL('/auth/callback');

// Reads the session out of the URL Supabase redirected back to.
//
// The client runs the IMPLICIT flow (see config/supabase.ts — flowType is left
// at its default), so the credentials arrive in the FRAGMENT:
//   localup-app://auth/callback#access_token=…&refresh_token=…
// PKCE would put a `?code=` in the query instead and would be the better
// choice for a native app, but switching flowType is global: it would also
// change the password-recovery link shape, and that flow is verified working
// end to end. Not worth regressing a proven path for this.
const paramsOf = (url: string): Record<string, string> => {
  const out: Record<string, string> = {};
  const marker = url.search(/[?#]/);
  if (marker === -1) return out;
  for (const part of url.slice(marker + 1).split(/[&#]/)) {
    const [k, v] = part.split('=');
    if (k && v !== undefined) {
      out[decodeURIComponent(k)] = decodeURIComponent(v);
    }
  }
  return out;
};

// Sign in with Google.
//
// Three legs, and each one can fail differently:
//   1. ask Supabase for the provider URL (skipBrowserRedirect: we open it)
//   2. open it in the system auth session and wait for the redirect back
//   3. turn what came back into a session
//
// The user closing the browser is NOT an error — it is a choice, and it must
// leave the screen exactly as it was rather than raising an alert at someone
// who simply changed their mind.
export function useGoogleSignIn() {
  return useMutation({
    mutationFn: async (): Promise<'signed-in' | 'cancelled'> => {
      const redirectTo = googleRedirectTo();

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          // We drive the browser ourselves; without this, supabase-js tries to
          // navigate, which does nothing in React Native.
          skipBrowserRedirect: true,
        },
      });
      if (error) throw error;
      if (!data?.url) throw new AuthFailure(AuthErrorCode.UNKNOWN);

      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectTo,
      );

      // 'cancel' = dismissed deliberately, 'dismiss' = swiped away. Neither is
      // a failure. Anything else means the browser never handed us a URL.
      if (result.type !== 'success') return 'cancelled';

      const p = paramsOf(result.url);

      // The provider can also come back with a refusal — access_denied when
      // the user declines the consent screen. Same as cancelling.
      if (p.error === 'access_denied') return 'cancelled';
      if (p.error || p.error_code) throw new AuthFailure(AuthErrorCode.UNKNOWN);

      if (!p.access_token || !p.refresh_token) {
        throw new AuthFailure(AuthErrorCode.UNKNOWN);
      }

      // Announce BEFORE writing: a cold-start bootstrap may still be mid-read
      // of the persisted session and must discard that result rather than
      // write the previous user back over this one. Same reasoning as
      // useAuthDeepLink — this is the second door into the same room.
      invalidateAuthBootstrap();

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: p.access_token,
        refresh_token: p.refresh_token,
      });
      if (sessionError) throw sessionError;

      return 'signed-in';
    },
  });
}
