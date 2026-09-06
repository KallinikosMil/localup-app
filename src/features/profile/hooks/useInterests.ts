import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';

import { supabase } from '@config/supabase';
import { RootState } from '@store';

// Reading and writing the caller's interests.
//
// Until now there was no write path at all: they were chosen once during
// onboarding, inside complete_onboarding, and nothing could ever change
// them again. That is not cosmetic — discover_candidates weights shared
// interests at 10 out of 20, the strongest signal it has, so a hasty
// choice during signup shaped every deck the person would ever see.

export type Interest = {
  id: string;
  name: string;
  category: string;
};

// The catalogue, ordered ON THE SERVER. A SELECT without ORDER BY promises
// no order, so the same query can return the categories — and the chips
// inside them — arranged differently on each load, and a grid the user has
// learned the shape of quietly rearranges itself.
export const useInterestCatalogue = () =>
  useQuery({
    queryKey: ['interests'],
    // The catalogue is effectively static; refetching it per screen is
    // waste, and it is shared with onboarding.
    staleTime: 60 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('interests')
        .select('id, name, category')
        .eq('is_active', true)
        .order('category')
        .order('name');
      if (error) throw error;
      return (data ?? []) as Interest[];
    },
  });

// Grouped for a sectioned grid, preserving the server's order in both
// dimensions. Returned as pairs rather than an object because object key
// order is only guaranteed for non-numeric keys, and a category could one
// day be renamed to something numeric.
export const groupByCategory = (
  interests: readonly Interest[],
): [string, Interest[]][] => {
  const out: [string, Interest[]][] = [];
  for (const interest of interests) {
    const last = out[out.length - 1];
    if (last && last[0] === interest.category) {
      last[1].push(interest);
    } else {
      out.push([interest.category, [interest]]);
    }
  }
  return out;
};

// The caller's current selection, as ids.
export const useMyInterests = () => {
  const uid = useSelector((s: RootState) => s.auth.user?.uid);

  return useQuery({
    queryKey: ['my-interests', uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_interests')
        .select('interest_id')
        .eq('user_id', uid!);
      if (error) throw error;
      return (data ?? []).map(r => r.interest_id as string);
    },
  });
};

export const useUpdateInterests = () => {
  const uid = useSelector((s: RootState) => s.auth.user?.uid);
  const queryClient = useQueryClient();

  return useMutation({
    // Through an RPC, not a delete-then-insert from here. Replacing a set is
    // two statements, and a client that dies between them leaves the user
    // with none — which would take profiles.interest_ids down with it,
    // since the trigger follows this table. set_user_interests does both in
    // one transaction and enforces the 3-8 rule server-side, where a second
    // client cannot skip it.
    mutationFn: async (interestIds: string[]) => {
      const { error } = await supabase.rpc('set_user_interests', {
        p_interest_ids: interestIds,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-interests', uid] });
      // profiles.interest_ids is refreshed by a trigger on user_interests,
      // so the profile the screen shows is stale the moment this returns.
      queryClient.invalidateQueries({ queryKey: ['profile', uid] });
      // And the deck is ranked on exactly this, so its cached page was
      // scored against the old selection.
      queryClient.invalidateQueries({ queryKey: ['discover-candidates', uid] });
    },
  });
};
