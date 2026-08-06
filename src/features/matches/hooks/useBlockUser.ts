import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';

import { supabase } from '@config/supabase';
import { RootState } from '@store';
import type { Match } from '@features/matches/hooks/useMatches';

// Blocks someone. The RPC does two things in one transaction — records
// the block and ends any active match with them — because a block that
// left the conversation in the Matches list would be worse than useless.
//
// Hiding is enforced in the database, in BOTH directions, inside
// discover_candidates. Nothing here has to remember to filter, and the
// blocked user is never told: RLS on `blocks` only ever exposes blocks
// YOU created.
export const useBlockUser = () => {
  const uid = useSelector((s: RootState) => s.auth.user?.uid);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.rpc('block_user', {
        p_user_id: userId,
      });
      if (error) throw error;
    },
    onSuccess: (_r, userId) => {
      // Drop them from the cached list straight away rather than leaving
      // the row you just blocked on screen until a refetch.
      queryClient.setQueryData<Match[]>(['matches', uid], old =>
        (old ?? []).filter(m => m.user_id !== userId),
      );
      queryClient.invalidateQueries({ queryKey: ['matches', uid] });
      // The deck must forget them too — they are now filtered server-side.
      queryClient.invalidateQueries({
        queryKey: ['discover-candidates', uid],
      });
    },
  });
};
