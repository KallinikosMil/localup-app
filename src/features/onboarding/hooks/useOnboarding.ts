import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@config/supabase';
import { store } from '@store';
import { setOnboardingComplete } from '@features/auth/slices/authSlice';

// H3: the coords/photo are REQUIRED here, not optional. The screen
// used to paper over missing values with `?? 0` / `?? ''` — see
// interests.tsx. Typing them as non-null makes that impossible to
// re-introduce without the compiler complaining.
type OnboardingData = {
  displayName: string;
  dateOfBirth: string;
  homeCity: string;
  homeLat: number;
  homeLng: number;
  photoUri: string;
  interestIds: string[];
  bio?: string;
};

// The only bucket that exists in this project is `user-photos`
// (public). The old code uploaded to `avatars`, which DOES NOT EXIST —
// storage answered "Bucket not found" and onboarding died on step 1.
// Every test user is seeded straight into the DB, so the flow was never
// actually exercised. Keep this in sync with useUploadPhoto.
const PHOTO_BUCKET = 'user-photos';

const ALLOWED_EXTS = ['jpg', 'jpeg', 'png', 'webp', 'heic'];

// The bucket's RLS policies are owner-scoped on the FIRST path segment
// (`<uid>/...`), so the uid prefix is mandatory, not cosmetic. There is
// an INSERT policy but NO UPDATE policy, which means `upsert: true`
// fails with 403 on any path that already exists — so every upload gets
// a fresh, unique name (exactly what useUploadPhoto does).
const buildPhotoPath = (userId: string, photoUri: string) => {
  const rawExt = photoUri.split('?')[0].split('.').pop()?.toLowerCase() ?? '';
  const ext = ALLOWED_EXTS.includes(rawExt) ? rawExt : 'jpg';
  const contentType = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;
  return {
    path: `${userId}/${Date.now()}.${ext}`,
    contentType,
  };
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
      if (!data.photoUri) {
        throw new Error('a photo is required to complete onboarding');
      }
      if (data.interestIds.length === 0) {
        throw new Error('at least one interest is required');
      }

      // 1. Upload the avatar. Mirrors useUploadPhoto: fetch the local
      //    file into an ArrayBuffer (RN-safe) and upload with an
      //    explicit contentType.
      const { path, contentType } = buildPhotoPath(user.id, data.photoUri);

      const response = await fetch(data.photoUri);
      const blob = await response.blob();
      const arrayBuffer = await new Response(blob).arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from(PHOTO_BUCKET)
        .upload(path, arrayBuffer, {
          contentType,
          upsert: false,
        });
      if (uploadError) throw uploadError;

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
      if (rpcError) throw rpcError;

      // 4. Only now is the user really onboarded.
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
