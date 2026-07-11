import { useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@config/supabase';
import { useSelector } from 'react-redux';
import { RootState } from '@store';

export type ProfileMode = 'traveler' | 'local';

export type Profile = {
  user_id: string;
  display_name: string | null;
  home_city: string | null;
  home_lat: number | null;
  home_lng: number | null;
  current_lat: number | null;
  current_lng: number | null;
  bio: string | null;
  avatar_url: string | null;
  mode_override: ProfileMode | null;
  interests: string[];
};

export type Photo = {
  id: string;
  url: string;
  is_primary: boolean;
};

export const useProfile = () => {
  const uid = useSelector((s: RootState) => s.auth.user?.uid);

  return useQuery({
    queryKey: ['profile', uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select(
          'user_id, display_name, home_city, home_lat, home_lng, current_lat, current_lng, bio, avatar_url, mode_override',
        )
        .eq('user_id', uid!)
        .single();

      if (error) throw error;

      // W12: swallowing this error rendered the profile with NO
      // interests — indistinguishable from a user who picked none.
      // A failure must not present as data.
      const { data: userInterests, error: interestsError } = await supabase
        .from('user_interests')
        .select('interest_id, interests(name)')
        .eq('user_id', uid!);

      if (interestsError) throw interestsError;

      const interests = (userInterests ?? [])
        .map((ui: any) => ui.interests?.name ?? '')
        .filter(Boolean);

      return {
        ...profile,
        interests,
      } as Profile;
    },
  });
};

export type ProfileUpdate = Partial<{
  display_name: string;
  bio: string;
  home_city: string;
  home_lat: number | null;
  home_lng: number | null;
  mode_override: ProfileMode | null;
}>;

export const useUpdateProfile = () => {
  const uid = useSelector((s: RootState) => s.auth.user?.uid);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (patch: ProfileUpdate) => {
      const { error } = await supabase
        .from('profiles')
        .update(patch)
        .eq('user_id', uid!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['profile', uid],
      });
    },
  });
};

export const usePhotos = (userId: string | null | undefined) => {
  return useQuery({
    queryKey: ['photos', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('media')
        .select('id, storage_path, is_primary')
        .eq('user_id', userId!)
        .eq('type', 'photo')
        .order('created_at', {
          ascending: true,
        });

      if (error) throw error;

      return (data ?? []).map(m => {
        const { data: urlData } = supabase.storage
          .from('user-photos')
          .getPublicUrl(m.storage_path);
        return {
          id: m.id,
          url: urlData.publicUrl,
          is_primary: m.is_primary ?? false,
        } as Photo;
      });
    },
  });
};

export const useUploadPhoto = () => {
  const uid = useSelector((s: RootState) => s.auth.user?.uid);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      uri,
      mimeType,
    }: {
      uri: string;
      mimeType: string;
    }) => {
      const ext = mimeType.split('/')[1] ?? 'jpg';
      const fileName = `${Date.now()}.${ext}`;
      const path = `${uid}/${fileName}`;

      const response = await fetch(uri);
      const blob = await response.blob();
      const arrayBuffer = await new Response(blob).arrayBuffer();

      const { error: upErr } = await supabase.storage
        .from('user-photos')
        .upload(path, arrayBuffer, {
          contentType: mimeType,
          upsert: false,
        });

      if (upErr) throw upErr;

      const { error: dbErr } = await supabase.from('media').insert({
        user_id: uid,
        type: 'photo',
        storage_path: path,
      });

      if (dbErr) throw dbErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['photos', uid],
      });
    },
  });
};

export const useDeletePhoto = () => {
  const uid = useSelector((s: RootState) => s.auth.user?.uid);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (photoId: string) => {
      const { data: media, error: fErr } = await supabase
        .from('media')
        .select('storage_path')
        .eq('id', photoId)
        .single();
      if (fErr) throw fErr;

      // H3: this error was ignored and the DB row was deleted anyway —
      // so a failed storage delete orphaned the file forever (still
      // stored, still billed) while the app confidently believed it was
      // gone, with no way to ever find it again. Delete the file FIRST
      // and only drop the row once storage confirms; if storage fails we
      // keep the row, surface the error, and the user can retry.
      const { error: rmErr } = await supabase.storage
        .from('user-photos')
        .remove([media.storage_path]);
      if (rmErr) throw rmErr;

      const { error: dErr } = await supabase
        .from('media')
        .delete()
        .eq('id', photoId);
      if (dErr) throw dErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['photos', uid],
      });
    },
  });
};

// Pushes the device's current location into
// the user's profile so candidate matching
// (server-side) and mode auto-detect (any
// client) see fresh coordinates. Throttled
// so we don't write on every GPS twitch.
const LOCATION_MIN_MOVE_KM = 0.5;
const LOCATION_MIN_INTERVAL_MS = 5 * 60 * 1000;

export const useSyncLocation = (lat: number | null, lng: number | null) => {
  const uid = useSelector((s: RootState) => s.auth.user?.uid);
  const queryClient = useQueryClient();
  const lastSync = useRef<{
    lat: number;
    lng: number;
    at: number;
  } | null>(null);

  useEffect(() => {
    if (!uid || lat == null || lng == null) return;

    // Skip the well-known Android emulator
    // default (Mountain View, CA) so it
    // doesn't overwrite real persisted coords
    // during local dev. Matches to ~50m.
    const isEmulatorDefault =
      Math.abs(lat - 37.4219983) < 0.0005 && Math.abs(lng - -122.084) < 0.0005;
    if (isEmulatorDefault) return;

    const prev = lastSync.current;
    const now = Date.now();
    if (prev) {
      const moved = haversineKm(prev.lat, prev.lng, lat, lng);
      const tooSoon = now - prev.at < LOCATION_MIN_INTERVAL_MS;
      if (moved < LOCATION_MIN_MOVE_KM && tooSoon) return;
    }

    lastSync.current = {
      lat,
      lng,
      at: now,
    };

    const syncLocation = async () => {
      const { error } = await supabase
        .from('profiles')
        .update({
          current_lat: lat,
          current_lng: lng,
          last_location_at: new Date().toISOString(),
        })
        .eq('user_id', uid);
      if (error) {
        // Reset so we retry next change.
        lastSync.current = null;
        return;
      }
      // W6 (reframed): a location write has to propagate through the
      // location-derived pipeline, not just the profile row. Two
      // uid-scoped queries actually change with the coords we wrote:
      //   ['profile']            — the mode badge (computeMode reads
      //                            profiles.current_lat/lng)
      //   ['discover-candidates']— the deck (distance_km +
      //                            candidate_mode are computed
      //                            server-side from the swiper coords)
      // useSyncLocation wrote the coords but invalidated neither, so
      // both served stale results until a manual refresh. Patch the
      // profile optimistically for an INSTANT badge, then invalidate
      // both so they refetch coherently. (Throttled — see the guards
      // above — and writes the DB before invalidating, so it doesn't
      // loop with useStaleLocationRefetch.) Prefs aren't location-
      // derived; the deck refetch re-reads the unchanged prefs anyway.
      queryClient.setQueryData<Profile>(['profile', uid], prev =>
        prev
          ? {
              ...prev,
              current_lat: lat,
              current_lng: lng,
            }
          : prev,
      );
      queryClient.invalidateQueries({
        queryKey: ['profile', uid],
      });
      queryClient.invalidateQueries({
        queryKey: ['discover-candidates', uid],
      });
    };

    syncLocation();
  }, [uid, lat, lng, queryClient]);
};

export const haversineKm = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
};

export const LOCAL_RADIUS_KM = 50;

export const computeMode = (
  profile: Profile | null | undefined,
  currentLat: number | null,
  currentLng: number | null,
): ProfileMode => {
  if (profile?.mode_override) {
    return profile.mode_override;
  }
  if (
    profile?.home_lat == null ||
    profile?.home_lng == null ||
    currentLat == null ||
    currentLng == null
  ) {
    return 'local';
  }
  const dist = haversineKm(
    currentLat,
    currentLng,
    profile.home_lat,
    profile.home_lng,
  );
  return dist > LOCAL_RADIUS_KM ? 'traveler' : 'local';
};
