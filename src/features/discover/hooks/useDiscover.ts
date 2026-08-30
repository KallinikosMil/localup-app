import { useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';

import { supabase } from '@config/supabase';
import { RootState } from '@store';
import { useProfile } from '@features/profile/hooks/useProfile';
import { haversineKm } from '@features/profile/utils/mode';
import { publicPhotoUrls } from '@shared/utils/storage';
import {
  PREF_DEFAULTS,
  useMatchPreferences,
} from '@features/discover/hooks/useMatchPreferences';

const STALE_GPS_KM_THRESHOLD = 5;

// What the RPC actually sends. `photo_paths` holds bucket-relative
// storage paths, NOT URLs — the mapping below turns them into public
// URLs so nothing downstream has to know the bucket exists.
type CandidateRow = Omit<Candidate, 'photo_urls'> & {
  photo_paths: string[] | null;
};

export type Candidate = {
  user_id: string;
  display_name: string;
  // The card headline is "Elena, 27". Computed server-side — date_of_birth
  // is more than the screen needs and does not leave the database.
  age: number;
  bio: string | null;
  home_city: string | null;
  // The single photo the card used before the deck carried an ordered
  // set. Kept as the fallback for a profile whose media rows predate
  // `position`, so an old account never renders a blank hero.
  avatar_url: string | null;
  // Ordered by `media.position`, capped at 6 server-side. Empty for a
  // candidate who finished onboarding without uploading.
  photo_urls: string[];
  // Shared interests first, then alphabetical — the design leads with the
  // highlighted chips, so the order is the server's job, not a sort here.
  interest_names: string[];
  // WHICH ones are shared, not how many. `shared_interests` is a count and
  // you cannot colour a chip with a count.
  shared_interest_names: string[];
  current_lat: number | null;
  current_lng: number | null;
  languages: string[];
  last_location_at: string | null;
  distance_km: number;
  candidate_mode: 'local' | 'traveler';
  shared_interests: number;
  rank_score: number;
};

// The preferences hook lives in useMatchPreferences.ts, not here. There
// used to be a private copy in this file using the SAME query key —
// ['match-preferences', uid] — but returning the raw snake_case row while
// the shared one returns camelCase. Two hooks, one cache key, two shapes:
// whichever mounted first won, and the filters screen silently read
// Discover's row and rendered blanks for every value.
export const useCandidates = () => {
  const uid = useSelector((s: RootState) => s.auth.user?.uid);
  const { data: prefs, isError: prefsError } = useMatchPreferences();

  // H2: a failed prefs read must NOT disable the deck. It used to —
  // `enabled: !!uid && !!prefs` meant a prefs error/hang left `prefs`
  // undefined forever, the deck query never ran, and RQ v5 reports
  // `isLoading === false` for a disabled query → Discover rendered
  // "No one nearby" permanently, with no spinner and nothing to retry.
  // Prefs are only a filter; degrade to the defaults and still show a
  // deck. (Failing loudly here would be worse than serving the same
  // defaults the query itself falls back to when the row is missing.)
  const effectivePrefs = prefs ?? (prefsError ? PREF_DEFAULTS : undefined);

  return useQuery({
    queryKey: [
      'discover-candidates',
      uid,
      {
        maxDist: effectivePrefs?.maxDistanceKm ?? PREF_DEFAULTS.maxDistanceKm,
        minAge: effectivePrefs?.minAge ?? PREF_DEFAULTS.minAge,
        maxAge: effectivePrefs?.maxAge ?? PREF_DEFAULTS.maxAge,
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

      // The second round trip that used to live here — a user_interests
      // read with an embedded `interests(name)` — is gone: the RPC now
      // returns the names itself. That retires both of its hazards. W12:
      // swallowing its error showed ZERO interests on every card, so the
      // deck looked fine and simply lied. H5: it read a PostgREST embed
      // as an object when a to-many embed is an ARRAY, which had already
      // dropped every interest from every card once, silently.
      return rows.map(({ photo_paths, ...r }) => ({
        ...r,
        photo_urls: publicPhotoUrls(photo_paths),
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

// `onMatched` is reported from the MUTATION-level onSuccess, not from a
// per-call one. react-query keeps a single set of per-call options per
// observer: mutate() overwrites #mutateOptions and detaches the observer
// from the previous mutation, so when two swipes overlap the first one's
// callbacks never run. A mutual match on the first of two quick swipes
// was invalidating ['matches'] — the match existed — while the
// celebration silently never appeared.
export const useSwipe = (onMatched?: (targetId: string) => void) => {
  const uid = useSelector((s: RootState) => s.auth.user?.uid);
  const queryClient = useQueryClient();

  // Held in a ref so the caller can pass an inline closure without
  // re-creating the mutation on every render.
  const onMatchedRef = useRef(onMatched);
  onMatchedRef.current = onMatched;

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
        onMatchedRef.current?.(result.targetId);
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
