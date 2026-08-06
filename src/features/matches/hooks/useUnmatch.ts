import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';

import { supabase } from '@config/supabase';
import { RootState } from '@store';
import type { Match } from '@features/matches/hooks/useMatches';

export const useUnmatch = () => {
  const uid = useSelector((s: RootState) => s.auth.user?.uid);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (matchId: string) => {
      // Goes through the end_match RPC rather than a direct UPDATE: there
      // is no UPDATE policy on `matches`, and adding one would not be
      // enough — an RLS UPDATE policy can only constrain the new row, so
      // it cannot stop a participant swapping the OTHER participant out.
      // The RPC takes identity from auth.uid() and raises if the caller
      // is not a participant, so a failure here is a real failure.
      const { error } = await supabase.rpc('end_match', {
        p_match_id: matchId,
      });
      if (error) throw error;
    },
    onSuccess: (_result, matchId) => {
      // Drop it from the cached list immediately so the user does not
      // watch the row they just removed sit there until a refetch.
      queryClient.setQueryData<Match[]>(['matches', uid], old =>
        (old ?? []).filter(m => m.id !== matchId),
      );
      queryClient.invalidateQueries({ queryKey: ['matches', uid] });
      // The deck excluded this person because they were matched; ending
      // the match changes who is eligible.
      queryClient.invalidateQueries({
        queryKey: ['discover-candidates', uid],
      });
    },
  });
};
