import { useMutation } from '@tanstack/react-query';
import { supabase } from '@config/supabase';

export function useLogin() {
  return useMutation({
    mutationFn: async ({
      email,
      password,
    }: {
      email: string;
      password: string;
    }) => {
      const { error } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
      if (error) throw error;
    },
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: async ({
      email,
      password,
    }: {
      email: string;
      password: string;
    }) => {
      const { data, error } =
        await supabase.auth.signUp({
          email: email.trim(),
          password,
        });

      const identities = data?.user?.identities;
      if (
        Array.isArray(identities) &&
        identities.length === 0
      ) {
        throw new Error(
          'Email already registered. Please log in.',
        );
      }

      if (error) throw error;
    },
  });
}

export function useLogout() {
  return useMutation({
    mutationFn: async () => {
      const { error } =
        await supabase.auth.signOut();
      if (error) throw error;
    },
  });
}
