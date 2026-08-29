import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';

import { supabase } from '@config/supabase';
import { RootState } from '@store';

// Reading and writing the deck filters.
//
// match_preferences has been read on every deck build since the RPC was
// written and set by nothing, so every user has been on the defaults with no
// way to change them.

// These must match the server. discover_candidates falls back to exactly
// these when a user has no row, so a screen showing anything else would be
// describing a deck the server is not building.
export const PREF_DEFAULTS = {
  maxDistanceKm: 75,
  minAge: 18,
  maxAge: 99,
} as const;

// Enforced by CHECK constraints, so these are the UI's copy of a rule the
// database owns — not the rule itself. The designer's slider stops at 150;
// the column allows up to 500, deliberately wider so the range can be opened
// later without a migration.
export const PREF_LIMITS = {
  distanceMin: 5,
  distanceMax: 500,
  ageMin: 18,
  ageMax: 99,
} as const;

export type MatchPreferences = {
  maxDistanceKm: number;
  minAge: number;
  maxAge: number;
};

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
