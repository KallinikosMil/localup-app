import { useQuery } from '@tanstack/react-query';
import { supabase } from '@config/supabase';
import { useSelector } from 'react-redux';
import { RootState } from '@store';

export type Profile = {
  user_id: string;
  display_name: string | null;
  home_city: string | null;
  bio: string | null;
  avatar_url: string | null;
  interests: string[];
};

export const useProfile = () => {
  const uid = useSelector(
    (s: RootState) => s.auth.user?.uid,
  );

  return useQuery({
    queryKey: ['profile', uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data: profile, error } =
        await supabase
          .from('profiles')
          .select(
            'user_id, display_name, home_city, bio, avatar_url',
          )
          .eq('user_id', uid!)
          .single();

      if (error) throw error;

      // Fetch interests
      const {
        data: userInterests,
      } = await supabase
        .from('user_interests')
        .select(
          'interest_id, interests(name)',
        )
        .eq('user_id', uid!);

      const interests = (
        userInterests ?? []
      ).map(
        (ui: any) =>
          ui.interests?.name ?? '',
      ).filter(Boolean);

      return {
        ...profile,
        interests,
      } as Profile;
    },
  });
};
