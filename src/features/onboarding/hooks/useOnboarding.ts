import { useMutation, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@config/supabase';
import { store } from '@store';
import { setOnboardingComplete } from '@features/auth/slices/authSlice';
import { PHOTO_BUCKET } from '@shared/utils/storage';

type OnboardingData = {
  displayName: string;
  dateOfBirth: string;
  homeCity: string;
  homeLat: number;
  homeLng: number;
  photoUris: string[];
  interestIds: string[];
  bio?: string;
  // Called as each photo starts uploading. Finishing used to be one
  // upload behind a bare spinner; with up to six it is long enough that
  // an unlabelled spinner reads as a hang.
  onProgress?: (done: number, total: number) => void;
};

const ALLOWED_EXTS = ['jpg', 'jpeg', 'png', 'webp', 'heic'];

// The bucket's RLS policies are owner-scoped on the FIRST path segment
// (`<uid>/...`), so the uid prefix is mandatory, not cosmetic. There is
// an INSERT policy but NO UPDATE policy, which means `upsert: true`
// fails with 403 on any path that already exists — so every upload gets
// a fresh, unique name (exactly what useUploadPhoto does).
const buildPhotoPath = (userId: string, photoUri: string, index: number) => {
  const rawExt = photoUri.split('?')[0].split('.').pop()?.toLowerCase() ?? '';
  const ext = ALLOWED_EXTS.includes(rawExt) ? rawExt : 'jpg';
  const contentType = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;
  // The index is part of the name, not decoration: six uploads in a loop
  // can land inside the same millisecond, and two identical names means
  // the second upload 403s (the bucket has an INSERT policy and no
  // UPDATE one, so upsert cannot save it).
  return {
    path: `${userId}/${Date.now()}-${index}.${ext}`,
    contentType,
  };
};

// Fetch the local file into an ArrayBuffer (RN-safe) and put it in the
// bucket under an owner-scoped path.
const uploadPhoto = async (userId: string, uri: string, index: number) => {
  const { path, contentType } = buildPhotoPath(userId, uri, index);
  const response = await fetch(uri);
  const blob = await response.blob();
  const arrayBuffer = await new Response(blob).arrayBuffer();

  const { error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, arrayBuffer, {
      contentType,
      upsert: false,
    });
  if (error) throw error;
  return path;
};

export function useCompleteOnboarding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: OnboardingData) => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('Not authenticated');

      // Defense-in-depth. The screens block Next without these, and the
      // RPC raises on them server-side, but refuse here too so we can
      // never write a half-formed profile: a missing date_of_birth, or
      // Null Island (0, 0) coords, which is a real place in the
      // Atlantic and would poison every distance calculation.
      if (!data.dateOfBirth) {
        throw new Error('date_of_birth is required to complete onboarding');
      }
      if (!Number.isFinite(data.homeLat) || !Number.isFinite(data.homeLng)) {
        throw new Error('home coordinates are required to complete onboarding');
      }
      if (data.photoUris.length === 0) {
        throw new Error('a photo is required to complete onboarding');
      }
      if (data.interestIds.length === 0) {
        throw new Error('at least one interest is required');
      }

      // 1. Upload the avatar — the FIRST photo, which is the one the
      //    deck and the profile hero lead with. The rest wait until the
      //    profile exists, because there is nothing for them to hang off
      //    until then.
      const [avatarUri, ...extraUris] = data.photoUris;
      const total = data.photoUris.length;
      data.onProgress?.(1, total);
      const path = await uploadPhoto(user.id, avatarUri, 0);

      // 2. Public URL — NOT a signed one. The old code persisted a
      //    1-year signed URL into profiles.avatar_url, so every avatar
      //    would silently 400 after 365 days with no error anywhere.
      //    The bucket is public; a public URL never expires.
      const { data: urlData } = supabase.storage
        .from(PHOTO_BUCKET)
        .getPublicUrl(path);

      // 3. One atomic call. This replaces the old profile upsert +
      //    media insert + user_interests insert, which were three
      //    separate, non-atomic writes: the profile flipped
      //    onboarding_complete=true BEFORE the interests were saved, so
      //    a failure at the last step let a user into the app with zero
      //    interests (permanently degraded matching) and no error.
      //    The RPC takes identity from auth.uid(), does all three writes
      //    in one transaction, and is idempotent — it wipes the user's
      //    existing media/user_interests first, so a retry after a
      //    partial failure can't duplicate anything.
      const { error: rpcError } = await supabase.rpc('complete_onboarding', {
        p_display_name: data.displayName,
        p_home_city: data.homeCity,
        p_home_lat: data.homeLat,
        p_home_lng: data.homeLng,
        p_bio: data.bio || null,
        p_date_of_birth: data.dateOfBirth,
        p_avatar_path: path,
        p_avatar_url: urlData.publicUrl,
        p_interest_ids: data.interestIds,
      });
      if (rpcError) {
        // The upload in step 1 already succeeded, so a failure here leaves
        // that object in the bucket with nothing referencing it — and the
        // filename is unique per attempt (upsert:false, the bucket has no
        // UPDATE policy), so every Finish retry leaked another copy.
        // Best-effort cleanup, and deliberately non-fatal: if the delete
        // itself fails we still surface the ORIGINAL error, which is the
        // one the user needs to see.
        const { error: cleanupError } = await supabase.storage
          .from(PHOTO_BUCKET)
          .remove([path]);
        if (cleanupError && __DEV__) {
          console.warn('[onboarding] orphaned upload left behind:', path);
        }
        throw rpcError;
      }

      // 4. The optional photos. Deliberately AFTER the transaction and
      //    deliberately not fatal: the account is already complete and
      //    correct with one photo, and failing the whole of onboarding
      //    over a fifth picture — forcing the user to redo four screens —
      //    would be a far worse outcome than arriving with fewer photos
      //    than they picked. Anything that does not land here can be
      //    added from Edit profile, which is the same append_photo call.
      for (const [i, uri] of extraUris.entries()) {
        data.onProgress?.(i + 2, total);
        try {
          const extraPath = await uploadPhoto(user.id, uri, i + 1);
          const { error: appendError } = await supabase.rpc('append_photo', {
            p_storage_path: extraPath,
          });
          if (appendError) throw appendError;
        } catch (err) {
          if (__DEV__) {
            console.warn('[onboarding] extra photo not saved:', err);
          }
        }
      }

      // 5. Only now is the user really onboarded.
      store.dispatch(setOnboardingComplete(true));

      return { userId: user.id };
    },
    // H4 — this mutation writes profiles + media + user_interests and
    // used to touch the query cache ZERO times (it didn't even import
    // useQueryClient). Today AppGuard masks it: a non-onboarded user
    // never mounts the tabs, so these queries have never been observed
    // and there is nothing stale to serve. That is a coincidence, not a
    // guarantee — with a 5-minute staleTime, the first time anything
    // reads a profile before onboarding finishes (a re-run after a
    // partial failure, a future "edit onboarding" entry point) the user
    // lands in the app on pre-onboarding data. Invalidate what we wrote.
    onSuccess: ({ userId }) => {
      queryClient.invalidateQueries({
        queryKey: ['profile', userId],
      });
      queryClient.invalidateQueries({
        queryKey: ['photos', userId],
      });
      queryClient.invalidateQueries({
        queryKey: ['discover-candidates', userId],
      });
    },
  });
}
