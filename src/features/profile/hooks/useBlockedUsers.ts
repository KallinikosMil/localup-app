import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@config/supabase';

// The people you have blocked, and the way back.
//
// `get_blocked_users` is SECURITY INVOKER: RLS on `blocks` already scopes
// rows to the blocker and profiles are readable by any authenticated
// user, so nothing here needs elevated rights.
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
