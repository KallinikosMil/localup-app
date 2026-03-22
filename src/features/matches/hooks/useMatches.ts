import { useQuery } from '@tanstack/react-query';
import { supabase } from '@config/supabase';
import { useSelector } from 'react-redux';
import { RootState } from '@store';

export type Match = {
  id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  home_city: string | null;
  created_at: string;
};

export const useMatches = () => {
  const uid = useSelector(
    (s: RootState) => s.auth.user?.uid,
  );

  return useQuery({
    queryKey: ['matches', uid],
    enabled: !!uid,
    queryFn: async () => {
      // Get matches where user is
      // either traveler or host
      const { data, error } =
        await supabase
          .from('matches')
          .select(
            'id, traveler_id, host_id, status, created_at',
          )
          .or(
            `traveler_id.eq.${uid},host_id.eq.${uid}`,
          )
          .eq('status', 'active')
          .order('created_at', {
            ascending: false,
          });

      if (error) throw error;

      // Get the other user's profile
      const otherIds = (data ?? []).map(
        m =>
          m.traveler_id === uid
            ? m.host_id
            : m.traveler_id,
      );

      if (otherIds.length === 0)
        return [];

      const { data: profiles, error: pErr } =
        await supabase
          .from('profiles')
          .select(
            'user_id, display_name, avatar_url, home_city',
          )
          .in('user_id', otherIds);

      if (pErr) throw pErr;

      const profileMap = new Map(
        (profiles ?? []).map(p => [
          p.user_id,
          p,
        ]),
      );

      return (data ?? []).map(m => {
        const otherId =
          m.traveler_id === uid
            ? m.host_id
            : m.traveler_id;
        const profile =
          profileMap.get(otherId);
        return {
          id: m.id,
          user_id: otherId,
          display_name:
            profile?.display_name ??
            'User',
          avatar_url:
            profile?.avatar_url ?? null,
          home_city:
            profile?.home_city ?? null,
          created_at: m.created_at,
        } as Match;
      });
    },
  });
};
