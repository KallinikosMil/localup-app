import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { supabase } from '@config/supabase';
import { useSelector } from 'react-redux';
import { RootState } from '@store';
import {
  computeMode,
  haversineKm,
  useProfile,
} from
  '@features/profile/hooks/useProfile';
import type { ProfileMode } from
  '@features/profile/hooks/useProfile';

// Max distance between swiper and candidate
// (current locations) for them to appear in
// the discover feed. A bit larger than the
// local-radius so adjacent travellers aren't
// clipped out.
const AREA_RADIUS_KM = 75;

export type Candidate = {
  user_id: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  home_city: string | null;
  interests: string[];
  distance_km?: number;
  mode: ProfileMode;
};

export const useCandidates = (
  lat: number | null,
  lng: number | null,
) => {
  const uid = useSelector(
    (s: RootState) => s.auth.user?.uid,
  );
  const { data: swiper } = useProfile();

  console.log('[DISCOVER-HOOK]', {
    uid,
    lat,
    lng,
    swiperLoaded: !!swiper,
    swiperCurrentLat: swiper?.current_lat,
    swiperCurrentLng: swiper?.current_lng,
    enabled:
      !!uid &&
      !!swiper &&
      (!!lat || swiper?.current_lat != null) &&
      (!!lng || swiper?.current_lng != null),
  });

  return useQuery({
    queryKey: [
      'candidates',
      uid,
      lat,
      lng,
      swiper?.mode_override,
      swiper?.home_lat,
      swiper?.home_lng,
    ],
    enabled:
      !!uid &&
      !!swiper &&
      (!!lat || swiper?.current_lat != null) &&
      (!!lng || swiper?.current_lng != null),
    queryFn: async () => {
      // Effective coords: prefer the swiper's
      // persisted current_lat/lng from their
      // profile (kept fresh by useSyncLocation)
      // and only fall back to live GPS if DB
      // has nothing yet. Persisted value wins
      // because emulator GPS often returns
      // stale Mountain View defaults.
      const effLat =
        swiper?.current_lat ?? lat ?? null;
      const effLng =
        swiper?.current_lng ?? lng ?? null;

      const swiperMode = computeMode(
        swiper ?? null,
        effLat,
        effLng,
      );

      console.log('[DISCOVER]', {
        uid,
        lat,
        lng,
        swiperHomeLat: swiper?.home_lat,
        swiperCurrentLat: swiper?.current_lat,
        effLat,
        effLng,
        swiperMode,
      });

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
          'user_id, display_name, bio, avatar_url, home_city, home_lat, home_lng, current_lat, current_lng, mode_override',
        )
        .eq('onboarding_complete', true)
        .neq('user_id', uid!)
        .limit(50);

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

      const rows = data ?? [];
      console.log('[DISCOVER] raw rows:', rows.length, rows.map(r => ({name: r.display_name, cur: [r.current_lat, r.current_lng], home: [r.home_lat, r.home_lng]})));

      // Filter: same area + opposite mode.
      const filtered = rows.filter(p => {
        if (
          p.current_lat == null ||
          p.current_lng == null ||
          effLat == null ||
          effLng == null
        ) {
          return false;
        }
        const distance = haversineKm(
          effLat,
          effLng,
          p.current_lat,
          p.current_lng,
        );
        if (distance > AREA_RADIUS_KM)
          return false;

        const candidateMode = computeMode(
          {
            home_lat: p.home_lat,
            home_lng: p.home_lng,
            mode_override:
              p.mode_override ?? null,
          } as any,
          p.current_lat,
          p.current_lng,
        );
        return candidateMode !== swiperMode;
      });

      // Fetch interests for survivors only.
      const ids = filtered.map(
        p => p.user_id,
      );

      const interestMap = new Map<
        string,
        string[]
      >();

      if (ids.length > 0) {
        const { data: userInterests } =
          await supabase
            .from('user_interests')
            .select(
              'user_id, interest_id, interests(name)',
            )
            .in('user_id', ids);

        for (const ui of userInterests ??
          []) {
          const names =
            interestMap.get(
              ui.user_id,
            ) ?? [];
          const name =
            (ui.interests as any)?.name ??
            '';
          if (name) names.push(name);
          interestMap.set(
            ui.user_id,
            names,
          );
        }
      }

      return filtered.map(p => {
        const distance_km =
          effLat != null &&
          effLng != null &&
          p.current_lat != null &&
          p.current_lng != null
            ? haversineKm(
                effLat,
                effLng,
                p.current_lat,
                p.current_lng,
              )
            : undefined;
        const mode = computeMode(
          {
            home_lat: p.home_lat,
            home_lng: p.home_lng,
            mode_override:
              p.mode_override ?? null,
          } as any,
          p.current_lat,
          p.current_lng,
        );
        return {
          user_id: p.user_id,
          display_name: p.display_name,
          bio: p.bio,
          avatar_url: p.avatar_url,
          home_city: p.home_city,
          interests:
            interestMap.get(p.user_id) ??
            [],
          distance_km,
          mode,
        } as Candidate;
      });
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
    onSuccess: result => {
      queryClient.invalidateQueries({
        queryKey: ['candidates'],
      });
      if (result.matched) {
        queryClient.invalidateQueries({
          queryKey: ['matches'],
        });
      }
    },
  });

  return swipeMutation;
};
