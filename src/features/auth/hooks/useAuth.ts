import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Linking from 'expo-linking';

import { supabase } from '@config/supabase';
import {
  AuthErrorCode,
  AuthFailure,
  classifySignUp,
} from '@features/auth/utils/authErrors';
import { releasePushToken } from '@features/notifications/hooks/usePushRegistration';

// The error taxonomy moved to utils/authErrors.ts — it is pure classification
// and had no business living behind React imports. Re-exported here because
// every auth screen already imports authErrorKey from this module.
export {
  authErrorKey,
  AuthErrorCode,
  AuthFailure,
} from '@features/auth/utils/authErrors';

// ─── Hooks ───────────────────────────────────────────────────────────

export function useLogin() {
  return useMutation({
    mutationFn: async ({
      email,
      password,
    }: {
      email: string;
      password: string;
    }) => {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
    },
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: async ({
      email,
      password,
    }: {
      email: string;
      password: string;
    }) => {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      // Check the error FIRST. It used to be checked last, after the
      // identities probe, so a real API error was read for its
      // (undefined) user shape before anyone asked whether the call had
      // failed at all.
      if (error) throw error;

      const outcome = classifySignUp(data);
      if (outcome === 'duplicate') {
        throw new AuthFailure(AuthErrorCode.EMAIL_TAKEN);
      }
      if (outcome === 'unverifiable') {
        throw new AuthFailure(AuthErrorCode.SIGNUP_UNVERIFIABLE);
      }
    },
  });
}

// Where Supabase should send the user back to after they tap the link in
// the recovery email. `createURL` resolves per environment — in Expo Go
// it produces the exp:// dev-server URL, in a standalone build the app's
// own `localup-app://` scheme — so the same code works in both.
//
// ⚠️ Whatever this resolves to must ALSO be listed under
// Authentication → URL Configuration → Redirect URLs in the Supabase
// dashboard, or the link silently falls back to the Site URL and the
// user lands nowhere useful. The dev-server URL changes with your LAN
// IP, so add a wildcard (exp://*) for development.
export const passwordResetRedirectTo = () =>
  Linking.createURL('/auth/reset-password');

// Sends the recovery email. Deliberately does NOT reveal whether the
// address exists: Supabase returns success either way, and the screen
// shows the same "check your inbox" message regardless — telling an
// anonymous caller which emails are registered is an enumeration
// vector, and this endpoint is reachable without a session.
export function useRequestPasswordReset() {
  return useMutation({
    mutationFn: async (email: string) => {
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo: passwordResetRedirectTo() },
      );
      if (error) throw error;
    },
  });
}

// Sets the new password. Only callable once the recovery link has
// established a session (Supabase signs the user in as part of the
// recovery flow), which is why this is a plain updateUser and not a
// token exchange.
export function useUpdatePassword() {
  return useMutation({
    mutationFn: async (password: string) => {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // BEFORE signOut, while there is still a session to authorise it.
      // Reacting to the session disappearing is too late — see
      // releasePushToken. Not fatal: failing to release a token must not
      // trap someone in an account they are trying to leave.
      try {
        await releasePushToken();
      } catch {
        // releasePushToken already logs; sign-out continues regardless.
      }
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
    // H4 — signOut() left the whole query cache in memory. Most keys are
    // uid-scoped, so a cross-user render is unlikely, but ['chat',
    // matchId] and ['interests'] are NOT scoped to a user, and every
    // cached row (messages, matches, the deck) survives for gcTime after
    // the session that was allowed to read it is gone. Log out means
    // forget: drop everything, so the next user starts from the network.
    onSuccess: () => {
      queryClient.clear();
    },
  });
}
