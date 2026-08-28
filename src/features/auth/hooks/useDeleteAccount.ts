import { useMutation, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@config/supabase';
import { AuthErrorCode, AuthFailure } from '@features/auth/utils/authErrors';

// Permanently deletes the signed-in account.
//
// The work happens in the `delete-account` Edge Function, because removing an
// auth user needs the service_role key and that key must never reach a phone.
// The function takes no arguments on purpose — it deletes whoever the caller's
// token says they are, so there is no parameter an attacker could point at
// somebody else.
//
// Nothing is passed here either: functions.invoke attaches the current session
// automatically, which is exactly the identity we want it to act on.
export function useDeleteAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke<{
        deleted?: boolean;
      }>('delete-account', { method: 'POST' });

      if (error) throw error;

      // A 200 that does not actually say `deleted` is not a success. Treating
      // it as one would tell someone their data is gone when it may not be —
      // the single worst lie this screen could tell.
      if (!data?.deleted) throw new AuthFailure(AuthErrorCode.UNKNOWN);

      // The account is gone, so the stored session now points at nobody.
      // Clear it locally: `scope: 'local'` because there is no longer a
      // server-side session to revoke, and asking to revoke one would fail.
      await supabase.auth.signOut({ scope: 'local' });
    },
    // The same reasoning as useLogout, which has done this since H4:
    // signOut leaves the whole query cache in memory, and ['chat', matchId]
    // and ['interests'] are not uid-scoped. Deleting an account and handing
    // the phone to someone who signs in next must not show them the
    // previous account's messages out of cache.
    //
    // push_tokens needs no release here: its user_id FK is ON DELETE
    // CASCADE, so removing the auth user takes the device token with it.
    onSuccess: () => {
      queryClient.clear();
    },
  });
}
