import { useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';

import { supabase } from '@config/supabase';
import { RootState } from '@store';
import { haversineKm } from '@features/profile/utils/mode';
import type { ProfileMode } from '@features/profile/utils/mode';
import { PHOTO_BUCKET, publicPhotoUrl } from '@shared/utils/storage';

// The mode rule and its type live in utils/mode.ts — it is pure arithmetic
// and belongs outside a hooks file. Re-exported so existing imports still
// resolve from here.
export type { ProfileMode } from '@features/profile/utils/mode';

export type Profile = {
  user_id: string;
  display_name: string | null;
  home_city: string | null;
  home_lat: number | null;
  home_lng: number | null;
  current_lat: number | null;
  current_lng: number | null;
  bio: string | null;
  // Your own row only, and only to render your age on your own card.
  // The deck never receives anybody else's: discover_candidates computes
  // the number server-side precisely so birth dates stay in the database.
  date_of_birth: string | null;
  avatar_url: string | null;
  mode_override: ProfileMode | null;
  interests: string[];
};

export type Photo = {
  id: string;
  url: string;
  // Slot in the grid. Position 0 IS the main photo — there is no separate
  // is_primary flag any more, because two sources of truth for "which one is
  // first" is how they drift apart. (The old flag was written only on the
  // type='avatar' row, which this query never returns, so no photo was ever
  // marked primary.)
  position: number;
};

// PostgREST returns an embedded relation as an OBJECT when it infers a
// to-one relationship and as an ARRAY when it infers to-many — and which
// one you get depends on the FK/constraint metadata, not on your query.
// Both readers of `user_interests(interests(name))` used to do
// `(row.interests as any)?.name`, which reads `undefined` from the array
// shape: every interest would silently vanish from every card and every
// profile, with the `as any` disabling the exact check that would have
// caught it. Accept both shapes; refuse anything else loudly.
export const interestNamesFrom = (embed: unknown): string[] => {
  // A null embed means the joined row wasn't visible (RLS) — legitimately
  // "no name", not a shape change.
  if (embed == null) return [];

  const rows = Array.isArray(embed) ? embed : [embed];

  return rows
    .map(row => {
      if (typeof row !== 'object' || row === null || !('name' in row)) {
        throw new Error(
          'user_interests: unexpected embed shape for interests(name)',
        );
      }
      const { name } = row as { name: unknown };
      if (name != null && typeof name !== 'string') {
        throw new Error('user_interests: interests.name is not a string');
      }
      return name ?? '';
    })
    .filter(Boolean);
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
          'user_id, display_name, home_city, home_lat, home_lng, current_lat, current_lng, bio, date_of_birth, avatar_url, mode_override',
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

      const interests = (userInterests ?? []).flatMap(ui =>
        interestNamesFrom(ui.interests),
      );

      return {
        ...profile,
        interests,
      } as Profile;
    },
  });
};

// The same read as useProfile, but for SOMEONE ELSE — the view-a-match's
// -profile screen. Separate hook rather than a parameter on useProfile so
// the two can never be confused at a call site: this one is read-only and
// its cache key is distinct, so a foreign profile can never be written
// into ['profile', <me>] and rendered as your own.
//
// `profiles` and `user_interests` are readable by any authenticated user
// (RLS), so no privileged path is needed here. Photos are the exception:
// `media` is owner-only PLUS an active-match policy, so usePhotos(otherId)
// returns rows only while you are actually matched — enforced in the
// database, not here.
// Someone else's profile.
//
// An RPC, not a table read, for one reason above all: the screen shows
// "Elena, 27" and a plain select would have to hand the phone a full
// date_of_birth to compute that. The server does the arithmetic and the
// date stays where it belongs. See get_public_profile.
//
// It also answers what the client cannot: distance (needs both people's
// positions), mode (same 50km rule as the deck) and WHICH interests are
// shared. And it removes the separate user_interests read, whose failure
// rendered a profile with no interests — indistinguishable from someone
// who chose none.
export type PublicProfile = {
  user_id: string;
  display_name: string | null;
  age: number | null;
  bio: string | null;
  home_city: string | null;
  avatar_url: string | null;
  interest_names: string[];
  shared_interest_names: string[];
  profile_mode: ProfileMode | null;
  distance_km: number | null;
};

export const useUserProfile = (userId: string | null | undefined) => {
  return useQuery({
    queryKey: ['user-profile', userId],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async (): Promise<PublicProfile | null> => {
      const { data, error } = await supabase.rpc('get_public_profile', {
        p_user_id: userId!,
      });
      if (error) throw error;
      // The RPC returns NO ROW for a blocked pair, deliberately: a blocked
      // user must not be able to confirm the account still exists. null
      // here is a real answer, not a failure.
      const rows = (data ?? []) as PublicProfile[];
      return rows[0] ?? null;
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
      // H4 — this is the W6 bug again, one layer up. The callers of this
      // mutation write MODE-DETERMINING fields: edit.tsx's setMode()
      // writes `mode_override`, setHomeHere() writes home_lat/home_lng.
      // The discover_candidates RPC derives the swiper's own mode
      // SERVER-SIDE from exactly those columns, and the deck's query key
      // doesn't embed mode — so invalidating only ['profile'] flipped the
      // badge instantly while the deck kept serving the OLD audience, and
      // the user could swipe and match on the wrong people. It never
      // self-heals: refetchOnWindowFocus is off, edit is pushed OVER the
      // still-mounted tabs (no remount), and staleTime is 5 minutes.
      queryClient.invalidateQueries({
        queryKey: ['discover-candidates', uid],
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
        .select('id, storage_path, position')
        .eq('user_id', userId!)
        .eq('type', 'photo')
        .order('position', {
          ascending: true,
        });

      if (error) throw error;

      return (data ?? []).map(
        m =>
          ({
            id: m.id,
            url: publicPhotoUrl(m.storage_path),
            position: m.position,
          }) as Photo,
      );
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
        .from(PHOTO_BUCKET)
        .upload(path, arrayBuffer, {
          contentType: mimeType,
          upsert: false,
        });

      if (upErr) throw upErr;

      // Through an RPC rather than a plain insert: the new row needs the next
      // free position, and only the server can read the current maximum and
      // write the row in the same statement. Computing it here from what the
      // client last saw would let two uploads claim the same slot.
      const { error: dbErr } = await supabase.rpc('append_photo', {
        p_storage_path: path,
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

// Drag-to-reorder in the edit grid.
//
// The whole order goes in one call, not one call per moved photo: N updates can
// fail halfway and leave the grid in an arrangement nobody chose, and every
// intermediate state has two photos sharing a slot. The RPC rewrites them in a
// single statement, and it refuses a partial list rather than renumbering some
// photos and leaving the rest on stale positions.
export const useReorderPhotos = () => {
  const uid = useSelector((s: RootState) => s.auth.user?.uid);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const { error } = await supabase.rpc('reorder_photos', {
        p_ids: orderedIds,
      });
      if (error) throw error;
    },
    // Optimistic: a drag that snaps back while the round trip completes reads
    // as a failed drag. Put the new order on screen immediately and roll back
    // only if the server actually refuses.
    onMutate: async (orderedIds: string[]) => {
      const key = ['photos', uid];
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Photo[]>(key);
      if (previous) {
        const byId = new Map(previous.map(photo => [photo.id, photo]));
        const next = orderedIds
          .map((id, index) => {
            const photo = byId.get(id);
            return photo ? { ...photo, position: index } : null;
          })
          .filter((photo): photo is Photo => photo !== null);
        queryClient.setQueryData(key, next);
      }
      return { previous };
    },
    onError: (_err, _ids, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['photos', uid], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['photos', uid] });
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
        .from(PHOTO_BUCKET)
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
      // Fix-B / V6 — THE RACE. We just wrote the coords; now they have to
      // reach ['profile'] (the badge) and ['discover-candidates'] (the
      // deck). Two previous fixes added exactly the two lines below and
      // BOTH failed on device, because on a cold open both are no-ops:
      //
      // This hook is mounted in the tabs layout, and the tabs' first
      // screen (Discover → useStaleLocationRefetch → useProfile) kicks
      // off the profile query's FIRST fetch on the same mount. That read
      // needs two sequential Supabase round trips (profiles, then
      // user_interests). Meanwhile useLocation resolves its first fix from
      // getLastKnownPositionAsync — an OS-cached value, no GPS wait, no
      // network — so our single-round-trip UPDATE lands while the profile
      // query is still in flight with `data === undefined`. In that exact
      // window, query-core degrades both cache primitives to no-ops:
      //
      //   • setQueryData bails when the updater returns undefined
      //     ("if (data === void 0) return"), and an updater that can only
      //     spread an existing `prev` returns undefined when there is none.
      //   • invalidate → refetch only CANCELS-AND-RESTARTS an in-flight
      //     fetch when the query already has data
      //     ("state.data !== void 0 && cancelRefetch"); otherwise it JOINS
      //     the in-flight promise and returns it.
      //
      // So the pre-write read lands last, wins, installs the OLD coords as
      // fresh data (staleTime 5min) and clears isInvalidated. Nothing
      // self-heals afterwards: the throttle above suppresses the next fix,
      // there is no focusManager/AppState wiring so refetchOnWindowFocus
      // can never fire, and Tabs keep the screen mounted so refetchOnMount
      // never runs. The badge stays LOCAL until the user pull-to-refreshes
      // — which works only because by then the query HAS data.
      //
      // Cancel the stale read FIRST (revert:true rejects its retryer, so
      // its late response is discarded and cannot land), and only then
      // patch and refetch. This is the standard optimistic-update ordering
      // and it is what makes the two lines below actually do something.
      await queryClient.cancelQueries({
        queryKey: ['profile', uid],
      });
      // The deck is subject to the exact same race: its first fetch can
      // already be in flight with the pre-write location, and it would
      // settle AFTER the invalidate below and win. Cancelling only
      // ['profile'] left this half of Fix-B open, so a cold open that
      // raced the location write still showed a stale deck.
      await queryClient.cancelQueries({
        queryKey: ['discover-candidates', uid],
      });
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
