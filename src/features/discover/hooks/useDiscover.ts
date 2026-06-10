import {
  useEffect,
  useRef,
} from 'react';
import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { supabase } from '@config/supabase';
import { useSelector } from 'react-redux';
import { RootState } from '@store';
import {
  haversineKm,
  useProfile,
} from '@features/profile/hooks/useProfile';

// If a fresh GPS fix drifts more than this from the
// coords the deck was computed against, invalidate
// and refetch. Captured-decision from brainstorm
// Round 3: keep cold-open fast (use stale), correct
// later only if the user actually moved.
const STALE_GPS_KM_THRESHOLD = 5;

export type Candidate = {
  user_id: string;
  display_name: string;
  bio: string | null;
  home_city: string | null;
  avatar_url: string | null;
  current_lat: number | null;
  current_lng: number | null;
  languages: string[];
  last_location_at: string | null;
  distance_km: number;
  candidate_mode: 'local' | 'traveler';
  shared_interests: number;
  rank_score: number;
  // Display-only, enriched client-side from user_interests
  // (RPC returns shared_interests count, not names).
  interests: string[];
};

type MatchPrefs = {
  max_distance_km: number | null;
  min_age: number | null;
  max_age: number | null;
};

const PREFS_FALLBACK: MatchPrefs = {
  max_distance_km: 75,
  min_age: 18,
  max_age: 99,
};

const useMatchPreferences = (uid: string | undefined) =>
  useQuery({
    queryKey: ['match-preferences', uid],
    enabled: !!uid,
    queryFn: async (): Promise<MatchPrefs> => {
      const { data, error } = await supabase
        .from('match_preferences')
        .select('max_distance_km, min_age, max_age')
        .eq('user_id', uid!)
        .maybeSingle();
      if (error) throw error;
      return data ?? PREFS_FALLBACK;
    },
  });

export const useCandidates = () => {
  const uid = useSelector(
    (s: RootState) => s.auth.user?.uid,
  );
  const { data: prefs } = useMatchPreferences(uid);

  return useQuery({
    queryKey: [
      'discover-candidates',
      uid,
      {
        maxDist:
          prefs?.max_distance_km ??
          PREFS_FALLBACK.max_distance_km,
        minAge:
          prefs?.min_age ??
          PREFS_FALLBACK.min_age,
        maxAge:
          prefs?.max_age ??
          PREFS_FALLBACK.max_age,
      },
    ],
    enabled: !!uid && !!prefs,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<Candidate[]> => {
      const { data, error } =
        await supabase.rpc('discover_candidates', {
          p_swiper_id: uid!,
          p_limit: 20,
        });
      if (error) throw error;

      const rows = (data ?? []) as Omit<
        Candidate,
        'interests'
      >[];
      if (rows.length === 0) return [];

      // Enrich with interest names in one batch
      // (RPC only returns the shared count).
      const ids = rows.map(r => r.user_id);
      const { data: ui } = await supabase
        .from('user_interests')
        .select('user_id, interests(name)')
        .in('user_id', ids);

      const nameMap = new Map<string, string[]>();
      for (const row of ui ?? []) {
        const list =
          nameMap.get(row.user_id) ?? [];
        const name =
          (row.interests as any)?.name ?? '';
        if (name) list.push(name);
        nameMap.set(row.user_id, list);
      }

      return rows.map(r => ({
        ...r,
        interests: nameMap.get(r.user_id) ?? [],
      }));
    },
  });
};

// Watches a fresh GPS fix and refetches the deck if
// the coords drifted enough from what the swiper's
// profile holds (the basis for the current deck).
// Captured-decision #3 from brainstorm Round 3.
export const useStaleLocationRefetch = (
  freshLat: number | null,
  freshLng: number | null,
) => {
  const uid = useSelector(
    (s: RootState) => s.auth.user?.uid,
  );
  const { data: swiper } = useProfile();
  const queryClient = useQueryClient();
  // Coords of the last invalidation. Until
  // useSyncLocation writes the new position to
  // the profile, drift stays > threshold on
  // every GPS tick — without this guard each
  // tick would invalidate → refetch in a loop.
  const lastInvalidated = useRef<{
    lat: number;
    lng: number;
  } | null>(null);

  useEffect(() => {
    if (
      !uid ||
      !swiper ||
      freshLat == null ||
      freshLng == null ||
      swiper.current_lat == null ||
      swiper.current_lng == null
    ) {
      return;
    }
    const drift = haversineKm(
      swiper.current_lat,
      swiper.current_lng,
      freshLat,
      freshLng,
    );
    if (drift <= STALE_GPS_KM_THRESHOLD) {
      return;
    }
    const last = lastInvalidated.current;
    if (
      last &&
      haversineKm(
        last.lat,
        last.lng,
        freshLat,
        freshLng,
      ) <= STALE_GPS_KM_THRESHOLD
    ) {
      // Already refetched for (near) these
      // coords — wait for real movement.
      return;
    }
    lastInvalidated.current = {
      lat: freshLat,
      lng: freshLng,
    };
    queryClient.invalidateQueries({
      queryKey: ['discover-candidates', uid],
    });
  }, [
    uid,
    swiper,
    freshLat,
    freshLng,
    queryClient,
  ]);
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
      const { error } = await supabase
        .from('swipes')
        .insert({
          swiper_id: uid,
          swiped_id: targetId,
          status: action,
        });
      if (error) throw error;

      if (action === 'liked') {
        const { data: mutual } =
          await supabase
            .from('swipes')
            .select('id')
            .eq('swiper_id', targetId)
            .eq('swiped_id', uid!)
            .eq('status', 'liked')
            .maybeSingle();

        if (mutual) {
          await supabase
            .from('matches')
            .insert({
              traveler_id: uid,
              host_id: targetId,
              status: 'active',
            });

          await supabase
            .from('swipes')
            .update({ status: 'matched' })
            .eq('swiper_id', uid!)
            .eq('swiped_id', targetId);

          await supabase
            .from('swipes')
            .update({ status: 'matched' })
            .eq('swiper_id', targetId)
            .eq('swiped_id', uid!);

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
      // Deliberately NO deck invalidation here.
      // The deck is consumed locally and only
      // refetched on exhaustion — swipe-exclusion
      // in the RPC IS the pagination (Captured
      // Decision #1). Per-swipe invalidation
      // would re-pack the deck from 0 while the
      // screen's cursor keeps advancing,
      // skipping candidates.
      if (result.matched) {
        queryClient.invalidateQueries({
          queryKey: ['matches'],
        });
      }
    },
  });

  return swipeMutation;
};
