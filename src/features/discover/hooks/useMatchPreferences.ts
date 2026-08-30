import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';

import { supabase } from '@config/supabase';
import {
  PREF_DEFAULTS,
  type DistanceSummary,
  type MatchPreferences,
} from '@features/discover/utils/preferences';
import { RootState } from '@store';

// Reading and writing the deck filters.
//
// match_preferences has been read on every deck build since the RPC was
// written and set by nothing, so every user has been on the defaults with no
// way to change them.

// The values themselves live in utils/preferences so they can be tested
// without a test runner having to load react-query. Re-exported because
// every caller wants the numbers and the queries together.
export {
  PREF_DEFAULTS,
  PREF_LIMITS,
  SUGGEST_CAP_KM,
  type MatchPreferences,
  type DistanceSummary,
} from '@features/discover/utils/preferences';

export const useMatchPreferences = () => {
  const uid = useSelector((s: RootState) => s.auth.user?.uid);

  return useQuery<MatchPreferences>({
    queryKey: ['match-preferences', uid],
    enabled: !!uid,
    queryFn: async () => {
      // maybeSingle, not single: a user who has never opened this screen has
      // no row, and that is the normal case rather than an error.
      const { data, error } = await supabase
        .from('match_preferences')
        .select('max_distance_km, min_age, max_age')
        .eq('user_id', uid!)
        .maybeSingle();
      if (error) throw error;
      if (!data) return { ...PREF_DEFAULTS };
      return {
        maxDistanceKm: Number(data.max_distance_km),
        minAge: data.min_age,
        maxAge: data.max_age,
      };
    },
  });
};

export const useUpdateMatchPreferences = () => {
  const uid = useSelector((s: RootState) => s.auth.user?.uid);
  const queryClient = useQueryClient();

  return useMutation({
    // An RPC rather than an upsert from here, so the first save creates the
    // row and later ones update it through one path. The CHECK constraints
    // do the validating either way, which keeps the error a client sees the
    // same whichever call wrote it.
    mutationFn: async (prefs: MatchPreferences) => {
      const { error } = await supabase.rpc('set_match_preferences', {
        p_max_distance_km: prefs.maxDistanceKm,
        p_min_age: prefs.minAge,
        p_max_age: prefs.maxAge,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['match-preferences', uid] });
      // The cached deck was built under the old filters, so it is not just
      // stale — it is a different question's answer.
      queryClient.invalidateQueries({ queryKey: ['discover-candidates', uid] });
    },
  });
};

// How many people a setting would show, for the counter and the
// too-narrow warning. Takes the values rather than reading the saved row, so
// a slider can preview a setting before it is saved — which is the point of
// warning about it.
//
// Returns null when the app has no location fix: zero would read as "nobody
// is near you" when the truth is that we do not know where you are.
export const useCandidateCount = (prefs: MatchPreferences | undefined) => {
  const uid = useSelector((s: RootState) => s.auth.user?.uid);

  return useQuery<number | null>({
    queryKey: [
      'candidate-count',
      uid,
      prefs?.maxDistanceKm,
      prefs?.minAge,
      prefs?.maxAge,
    ],
    enabled: !!uid && !!prefs,
    // The slider moves continuously; without this every intermediate value
    // would be its own round trip.
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('count_candidates', {
        p_max_distance_km: Math.round(prefs!.maxDistanceKm),
        p_min_age: prefs!.minAge,
        p_max_age: prefs!.maxAge,
      });
      if (error) throw error;
      return data === null ? null : Number(data);
    },
  });
};

// The shape of the room, for the too-narrow warning: where people actually
// are, and the smallest round radius that would fill a deck.
//
// **null means one thing only: no location fix.** It used to mean that OR
// "nobody at any distance in this age range", and a caller cannot tell two
// different silences apart — which let the Filters screen tell someone
// "no one in that age range" when the truth was that their GPS had not
// reported yet. The server now returns a row with `total: 0` for the
// second case, so read the number, not the absence.
export const useDistanceSummary = (minAge: number, maxAge: number) => {
  const uid = useSelector((s: RootState) => s.auth.user?.uid);

  return useQuery<DistanceSummary | null>({
    queryKey: ['distance-summary', uid, minAge, maxAge],
    enabled: !!uid,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('candidate_distance_summary', {
        p_min_age: minAge,
        p_max_age: maxAge,
      });
      if (error) throw error;
      const row = (data as unknown[] | null)?.[0] as
        | {
            total: number;
            p25_km: number;
            p75_km: number;
            suggested_km: number;
            suggested_count: number;
          }
        | undefined;
      if (!row) return null;
      return {
        total: Number(row.total),
        p25Km: Number(row.p25_km),
        p75Km: Number(row.p75_km),
        suggestedKm: Number(row.suggested_km),
        suggestedCount: Number(row.suggested_count),
      };
    },
  });
};
