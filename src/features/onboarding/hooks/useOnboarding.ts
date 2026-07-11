import { useMutation } from '@tanstack/react-query';
import { supabase } from '@config/supabase';
import { store } from '@store';
import { setOnboardingComplete } from '@features/auth/slices/authSlice';

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

export function useCompleteOnboarding() {
  return useMutation({
    mutationFn: async (data: OnboardingData) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Defense-in-depth: name-age screen blocks Next without DOB,
      // but refuse here too so onboarding_complete=true can never
      // coexist with a missing/empty date_of_birth.
      if (!data.dateOfBirth) {
        throw new Error('date_of_birth is required to complete onboarding');
      }

      // 1. Upload photo using FormData (RN-safe)
      const fileExt = data.photoUri.split('.').pop() ?? 'jpg';
      const filePath = `${user.id}/avatar.${fileExt}`;

      const formData = new FormData();
      formData.append('file', {
        uri: data.photoUri,
        name: `avatar.${fileExt}`,
        type: `image/${fileExt}`,
      } as any);

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, formData, {
          upsert: true,
        });
      if (uploadError) throw uploadError;

      // 2. Get signed URL (bucket is private)
      const { data: signedUrlData, error: urlError } = await supabase.storage
        .from('avatars')
        .createSignedUrl(filePath, 60 * 60 * 24 * 365);
      if (urlError) throw urlError;

      // 3. Upsert profile
      const { error: profileError } = await supabase.from('profiles').upsert({
        user_id: user.id,
        display_name: data.displayName,
        date_of_birth: data.dateOfBirth,
        home_city: data.homeCity,
        home_lat: data.homeLat,
        home_lng: data.homeLng,
        avatar_url: signedUrlData.signedUrl,
        bio: data.bio || null,
        onboarding_complete: true,
      });
      if (profileError) throw profileError;

      // 4. Insert media row
      await supabase.from('media').insert({
        user_id: user.id,
        type: 'avatar',
        storage_path: filePath,
        is_primary: true,
      });

      // 5. Save interests
      const interestRows = data.interestIds.map(id => ({
        user_id: user.id,
        interest_id: id,
      }));
      const { error: interestsError } = await supabase
        .from('user_interests')
        .insert(interestRows);
      if (interestsError) throw interestsError;

      // 6. Update Redux
      store.dispatch(setOnboardingComplete(true));
    },
  });
}
