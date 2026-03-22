import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { supabase } from '@config/supabase';
import { useSelector } from 'react-redux';
import { RootState } from '@store';

export type Candidate = {
  user_id: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  home_city: string | null;
  interests: string[];
  distance_km?: number;
};

export const useCandidates = (
  lat: number | null,
  lng: number | null,
) => {
  const uid = useSelector(
    (s: RootState) => s.auth.user?.uid,
  );

  return useQuery({
    queryKey: [
      'candidates',
      uid,
      lat,
      lng,
    ],
    enabled: !!uid && !!lat && !!lng,
    queryFn: async () => {
      // Get IDs the user has already swiped
      const { data: swiped } =
        await supabase
          .from('match_queue')
          .select('target_user_id')
          .eq('user_id', uid!);

      const swipedIds = (
        swiped ?? []
      ).map(s => s.target_user_id);

      // Fetch profiles excluding self
      // and already-swiped
      let query = supabase
        .from('profiles')
        .select(
          'user_id, display_name, bio, avatar_url, home_city',
        )
        .eq('onboarding_complete', true)
        .neq('user_id', uid!)
        .limit(20);

      if (swipedIds.length > 0) {
        query = query.not(
          'user_id',
          'in',
          `(${swipedIds.join(',')})`,
        );
      }

      const { data, error } =
        await query;
      if (error) throw error;

      // Fetch interests for each
      const ids = (data ?? []).map(
        p => p.user_id,
      );

      const { data: userInterests } =
        await supabase
          .from('user_interests')
          .select(
            'user_id, interest_id, interests(name)',
          )
          .in('user_id', ids);

      const interestMap = new Map<
        string,
        string[]
      >();
      for (const ui of userInterests ??
        []) {
        const names =
          interestMap.get(ui.user_id) ??
          [];
        const name =
          (ui.interests as any)?.name ??
          '';
        if (name) names.push(name);
        interestMap.set(
          ui.user_id,
          names,
        );
      }

      return (data ?? []).map(p => ({
        ...p,
        interests:
          interestMap.get(p.user_id) ??
          [],
      })) as Candidate[];
    },
  });
};

export const useSwipe = () => {
  const uid = useSelector(
    (s: RootState) => s.auth.user?.uid,
  );
  const queryClient = useQueryClient();

  const swipeMutation = useMutation({
    mutationFn: async ({
      targetId,
      action,
    }: {
      targetId: string;
      action: 'liked' | 'passed';
    }) => {
      // Insert the swipe
      const { error } = await supabase
        .from('match_queue')
        .insert({
          user_id: uid,
          target_user_id: targetId,
          status: action,
        });
      if (error) throw error;

      // Check for mutual like
      if (action === 'liked') {
        const { data: mutual } =
          await supabase
            .from('match_queue')
            .select('id')
            .eq('user_id', targetId)
            .eq(
              'target_user_id',
              uid!,
            )
            .eq('status', 'liked')
            .maybeSingle();

        if (mutual) {
          // Create match
          await supabase
            .from('matches')
            .insert({
              traveler_id: uid,
              host_id: targetId,
              status: 'active',
            });

          // Update both queue entries
          await supabase
            .from('match_queue')
            .update({
              status: 'matched',
            })
            .eq('user_id', uid!)
            .eq(
              'target_user_id',
              targetId,
            );

          await supabase
            .from('match_queue')
            .update({
              status: 'matched',
            })
            .eq('user_id', targetId)
            .eq(
              'target_user_id',
              uid!,
            );

          return {
            matched: true,
            targetId,
          };
        }
      }

      return {
        matched: false,
        targetId,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['candidates'],
      });
    },
  });

  return swipeMutation;
};
