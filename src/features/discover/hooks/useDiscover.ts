import { useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';

import { supabase } from '@config/supabase';
import { RootState } from '@store';
import {
  interestNamesFrom,
  useProfile,
} from '@features/profile/hooks/useProfile';
import { haversineKm } from '@features/profile/utils/mode';
import { publicPhotoUrls } from '@shared/utils/storage';

const STALE_GPS_KM_THRESHOLD = 5;

// What the RPC actually sends. `photo_paths` holds bucket-relative
// storage paths, NOT URLs — the mapping below turns them into public
// URLs so nothing downstream has to know the bucket exists.
type CandidateRow = Omit<Candidate, 'interests' | 'photo_urls'> & {
  photo_paths: string[] | null;
};

export type Candidate = {
  user_id: string;
  display_name: string;
  bio: string | null;
  home_city: string | null;
  // The single photo the card used before the deck carried an ordered
  // set. Kept as the fallback for a profile whose media rows predate
  // `position`, so an old account never renders a blank hero.
  avatar_url: string | null;
  // Ordered by `media.position`, capped at 6 server-side. Empty for a
  // candidate who finished onboarding without uploading.
  photo_urls: string[];
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
  const uid = useSelector((s: RootState) => s.auth.user?.uid);
  const { data: prefs, isError: prefsError } = useMatchPreferences(uid);

  // H2: a failed prefs read must NOT disable the deck. It used to —
  // `enabled: !!uid && !!prefs` meant a prefs error/hang left `prefs`
  // undefined forever, the deck query never ran, and RQ v5 reports
  // `isLoading === false` for a disabled query → Discover rendered
  // "No one nearby" permanently, with no spinner and nothing to retry.
  // Prefs are only a filter; degrade to the defaults and still show a
  // deck. (Failing loudly here would be worse than serving the same
  // defaults the query itself falls back to when the row is missing.)
  const effectivePrefs = prefs ?? (prefsError ? PREFS_FALLBACK : undefined);

  return useQuery({
    queryKey: [
      'discover-candidates',
      uid,
      {
        maxDist:
          effectivePrefs?.max_distance_km ?? PREFS_FALLBACK.max_distance_km,
        minAge: effectivePrefs?.min_age ?? PREFS_FALLBACK.min_age,
        maxAge: effectivePrefs?.max_age ?? PREFS_FALLBACK.max_age,
      },
    ],
    enabled: !!uid && !!effectivePrefs,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<Candidate[]> => {
      // No swiper id: the RPC derives it from auth.uid(). It used to take
      // one and never check it against the caller, so any signed-in user
      // could ask for anyone else's deck. `uid` is still used for the
      // query key and the enabled gate — just never sent as identity.
      const { data, error } = await supabase.rpc('discover_candidates', {
        p_limit: 20,
      });
      if (error) throw error;

      const rows = (data ?? []) as CandidateRow[];
      if (rows.length === 0) return [];

      // Enrich with interest names in one batch
      // (RPC only returns the shared count).
      const ids = rows.map(r => r.user_id);
      // W12: swallowing this error made every candidate silently show
      // ZERO interests — the deck looked fine, it just lied. Fail loudly
      // so the screen's error branch can offer a retry.
      const { data: ui, error: interestsError } = await supabase
        .from('user_interests')
        .select('user_id, interests(name)')
        .in('user_id', ids);
      if (interestsError) throw interestsError;

      // H5: this was `(row.interests as any)?.name` — see
      // interestNamesFrom. PostgREST hands back a to-one embed as an
      // object and a to-many as an ARRAY, and `as any` meant the array
      // shape would read `undefined` and drop every interest from every
      // card without a single error.
      const nameMap = new Map<string, string[]>();
      for (const row of ui ?? []) {
        const list = nameMap.get(row.user_id) ?? [];
        list.push(...interestNamesFrom(row.interests));
        nameMap.set(row.user_id, list);
      }

      return rows.map(({ photo_paths, ...r }) => ({
        ...r,
        photo_urls: publicPhotoUrls(photo_paths),
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
  const uid = useSelector((s: RootState) => s.auth.user?.uid);
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
      haversineKm(last.lat, last.lng, freshLat, freshLng) <=
        STALE_GPS_KM_THRESHOLD
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
  }, [uid, swiper, freshLat, freshLng, queryClient]);
};

// handle_swipe RETURNS TABLE (matched boolean, match_id uuid), so
// PostgREST sends back a one-row array. Accept a bare object too (that's
// what a RETURNS record would give us) — but accept nothing else.
type SwipeResult = {
  matched: boolean;
  matchId: string | null;
};

const parseSwipeResult = (data: unknown): SwipeResult => {
  const row = Array.isArray(data) ? data[0] : data;

  if (!row || typeof row !== 'object') {
    throw new Error('handle_swipe returned no row');
  }

  const { matched, match_id: matchId } = row as {
    matched?: unknown;
    match_id?: unknown;
  };

  if (typeof matched !== 'boolean') {
    throw new Error('handle_swipe: `matched` is missing or not a boolean');
  }

  // A mutual match with no id is a broken match: the celebration can't
  // navigate to /chat/[matchId] and the thread is unreachable. Better a
  // visible failure (the swipe is already persisted; onError resyncs the
  // deck) than a silently half-created match.
  if (matched && typeof matchId !== 'string') {
    throw new Error('handle_swipe: matched with no match_id');
  }

  return {
    matched,
    // Pass-through for the match celebration → /chat/[matchId] nav
    // (UI redesign spec).
    matchId: typeof matchId === 'string' ? matchId : null,
  };
};

export const useSwipe = () => {
  const uid = useSelector((s: RootState) => s.auth.user?.uid);
  const queryClient = useQueryClient();

  const swipeMutation = useMutation({
    mutationFn: async ({
      targetId,
      action,
    }: {
      targetId: string;
      action: 'liked' | 'passed';
    }) => {
      // Single atomic round trip: swipe insert,
      // mutual check, match creation and role
      // assignment all happen server-side
      // (handle_swipe RPC, SECURITY DEFINER —
      // PR #2 spec). Swiper identity comes
      // from the JWT, not a parameter.
      const { data, error } = await supabase.rpc('handle_swipe', {
        p_swiped_id: targetId,
        p_action: action,
      });
      if (error) throw error;

      // H5: this used to be `(data as {...}[])?.[0]` followed by
      // `matched: !!row?.matched`. A missing row or a drifted shape
      // coerced straight to `false` — so a REAL mutual match would
      // produce no celebration, no ['matches'] invalidation, and the
      // match would simply never appear. `!!undefined` is not an answer,
      // it's a guess. Validate, and throw if the RPC didn't tell us.
      return {
        ...parseSwipeResult(data),
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
    onError: () => {
      // The card already advanced
      // optimistically; resync the deck so
      // the candidate the failed swipe
      // skipped comes back.
      queryClient.invalidateQueries({
        queryKey: ['discover-candidates', uid],
      });
    },
  });

  return swipeMutation;
};
