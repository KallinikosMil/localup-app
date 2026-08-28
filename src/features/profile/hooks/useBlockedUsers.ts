import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@config/supabase';

// The people you have blocked, and the way back.
//
// `get_blocked_users` is SECURITY DEFINER. It used to be INVOKER, which
// worked only because profiles was readable by ANY authenticated user —
// and that policy was the hole: the table carries home and current
// coordinates and a full birthdate. profiles is owner-only now, so this
// RPC needs the elevated rights to read the blocked person's name and
// avatar at all. Its own `where b.blocker_id = auth.uid()` is what scopes
// it; that predicate is load-bearing, not decorative.
//
// It returns avatar_url and NOT photos, deliberately. `media` is readable
// by the owner or an ACTIVE MATCH, and blocking ends the match — making
// this DEFINER to get photos back would hand out storage paths for people
// the caller has explicitly cut off.

export type BlockedUser = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  blocked_at: string;
};

export const useBlockedUsers = () =>
  useQuery({
    queryKey: ['blocked-users'],
    queryFn: async (): Promise<BlockedUser[]> => {
      const { data, error } = await supabase.rpc('get_blocked_users');
      if (error) throw error;
      return (data ?? []) as BlockedUser[];
    },
  });

export const useUnblockUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.rpc('unblock_user', {
        p_user_id: userId,
      });
      if (error) throw error;
      return userId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocked-users'] });
      // The deck filters blocked users out server-side, so an unblocked
      // person can reappear in it — but only after the deck is refetched.
      // Without this they stay invisible until the cache happens to
      // expire, which reads as "unblock did nothing".
      queryClient.invalidateQueries({ queryKey: ['discover-candidates'] });
    },
  });
};
