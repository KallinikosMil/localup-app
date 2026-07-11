import { useMutation, useQueryClient } from '@tanstack/react-query';
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
      const { error } = await supabase.auth.signInWithPassword({
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
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      const identities = data?.user?.identities;
      if (Array.isArray(identities) && identities.length === 0) {
        throw new Error('Email already registered. Please log in.');
      }

      if (error) throw error;
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
    // H4 — signOut() left the whole query cache in memory. Most keys are
    // uid-scoped, so a cross-user render is unlikely, but ['chat',
    // matchId] and ['interests'] are NOT scoped to a user, and every
    // cached row (messages, matches, the deck) survives for gcTime after
    // the session that was allowed to read it is gone. Log out means
    // forget: drop everything, so the next user starts from the network.
    onSuccess: () => {
      queryClient.clear();
    },
  });
}
