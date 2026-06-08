import { useEffect } from 'react';
import {
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { supabase } from '@config/supabase';
import { useSelector } from 'react-redux';
import { RootState } from '@store';

export type Match = {
  id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  home_city: string | null;
  last_message: string | null;
  last_message_at: string | null;
  created_at: string;
};

export const useMatches = () => {
  const uid = useSelector(
    (s: RootState) => s.auth.user?.uid,
  );
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['matches', uid],
    enabled: !!uid,
    queryFn: async () => {
      // Get matches where user is
      // either traveler or host
      const { data, error } =
        await supabase
          .from('matches')
          .select(
            'id, traveler_id, host_id, status, created_at',
          )
          .or(
            `traveler_id.eq.${uid},host_id.eq.${uid}`,
          )
          .eq('status', 'active')
          .order('created_at', {
            ascending: false,
          });

      if (error) throw error;

      // Get the other user's profile
      const otherIds = (data ?? []).map(
        m =>
          m.traveler_id === uid
            ? m.host_id
            : m.traveler_id,
      );

      if (otherIds.length === 0)
        return [];

      const { data: profiles, error: pErr } =
        await supabase
          .from('profiles')
          .select(
            'user_id, display_name, avatar_url, home_city',
          )
          .in('user_id', otherIds);

      if (pErr) throw pErr;

      const profileMap = new Map(
        (profiles ?? []).map(p => [
          p.user_id,
          p,
        ]),
      );

      // Fetch threads for these matches
      const matchIds = (data ?? []).map(
        m => m.id,
      );

      const { data: threads } =
        await supabase
          .from('chat_threads')
          .select('id, match_id')
          .in('match_id', matchIds);

      const threadIdToMatchId = new Map(
        (threads ?? []).map(t => [
          t.id,
          t.match_id,
        ]),
      );
      const threadIds = (
        threads ?? []
      ).map(t => t.id);

      // Fetch latest message per thread
      let matchIdToLastMessage = new Map<
        string,
        { body: string; created_at: string }
      >();

      if (threadIds.length > 0) {
        const { data: messages } =
          await supabase
            .from('chat_messages')
            .select(
              'thread_id, body, created_at',
            )
            .in('thread_id', threadIds)
            .order('created_at', {
              ascending: false,
            });

        for (const msg of messages ?? []) {
          const matchId =
            threadIdToMatchId.get(
              msg.thread_id,
            );
          if (
            matchId &&
            !matchIdToLastMessage.has(
              matchId,
            )
          ) {
            matchIdToLastMessage.set(
              matchId,
              {
                body: msg.body ?? '',
                created_at: msg.created_at,
              },
            );
          }
        }
      }

      return (data ?? []).map(m => {
        const otherId =
          m.traveler_id === uid
            ? m.host_id
            : m.traveler_id;
        const profile =
          profileMap.get(otherId);
        const lastMsg =
          matchIdToLastMessage.get(m.id);
        return {
          id: m.id,
          user_id: otherId,
          display_name:
            profile?.display_name ??
            'User',
          avatar_url:
            profile?.avatar_url ?? null,
          home_city:
            profile?.home_city ?? null,
          last_message:
            lastMsg?.body ?? null,
          last_message_at:
            lastMsg?.created_at ?? null,
          created_at: m.created_at,
        } as Match;
      });
    },
  });

  // Subscribe to new matches and new
  // messages to update list in real-time
  useEffect(() => {
    if (!uid) return;

    const channel = supabase
      .channel(`matches-${uid}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'matches',
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: ['matches', uid],
          });
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: ['matches', uid],
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [uid, queryClient]);

  return query;
};
