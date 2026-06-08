import { useEffect } from 'react';
import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { supabase } from '@config/supabase';
import { useSelector } from 'react-redux';
import { RootState } from '@store';

export type ChatMessage = {
  id: string;
  sender_id: string;
  body: string | null;
  attachment_url: string | null;
  created_at: string;
};

export const useThread = (
  matchId: string,
) => {
  const uid = useSelector(
    (s: RootState) => s.auth.user?.uid,
  );
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['thread', matchId],
    enabled: !!uid && !!matchId,
    queryFn: async () => {
      const { data, error } =
        await supabase
          .from('chat_threads')
          .select('id')
          .eq('match_id', matchId)
          .maybeSingle();

      if (error) throw error;
      return data?.id ?? null;
    },
  });

  // Subscribe to thread creation when
  // no thread exists yet
  useEffect(() => {
    if (!matchId || query.data) return;

    const channel = supabase
      .channel(`thread-${matchId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_threads',
          filter: `match_id=eq.${matchId}`,
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: ['thread', matchId],
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [
    matchId,
    query.data,
    queryClient,
  ]);

  return query;
};

export const useMessages = (
  threadId: string | null,
) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['messages', threadId],
    enabled: !!threadId,
    queryFn: async () => {
      const { data, error } =
        await supabase
          .from('chat_messages')
          .select(
            'id, sender_id, body, attachment_url, created_at',
          )
          .eq('thread_id', threadId!)
          .order('created_at', {
            ascending: true,
          });

      if (error) throw error;
      return (data ?? []) as ChatMessage[];
    },
  });

  // Subscribe to new messages in real-time
  useEffect(() => {
    if (!threadId) return;

    const channel = supabase
      .channel(`messages-${threadId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `thread_id=eq.${threadId}`,
        },
        payload => {
          queryClient.setQueryData<
            ChatMessage[]
          >(
            ['messages', threadId],
            old => {
              const next =
                payload.new as ChatMessage;
              if (
                (old ?? []).some(
                  m => m.id === next.id,
                )
              ) {
                return old;
              }
              return [
                ...(old ?? []),
                next,
              ];
            },
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [threadId, queryClient]);

  return query;
};

export const useSendMessage = (
  matchId: string,
) => {
  const uid = useSelector(
    (s: RootState) => s.auth.user?.uid,
  );
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: string) => {
      // Get or create thread
      let { data: thread } =
        await supabase
          .from('chat_threads')
          .select('id')
          .eq('match_id', matchId)
          .maybeSingle();

      if (!thread) {
        // Look up the match to get
        // traveler/host ids
        const { data: match } =
          await supabase
            .from('matches')
            .select(
              'traveler_id, host_id',
            )
            .eq('id', matchId)
            .single();

        if (!match)
          throw new Error('Match not found');

        const { data: newThread, error } =
          await supabase
            .from('chat_threads')
            .insert({
              match_id: matchId,
              traveler_id:
                match.traveler_id,
              host_id: match.host_id,
            })
            .select('id')
            .single();

        if (error) throw error;
        thread = newThread;
      }

      // Insert message
      const { error: msgErr } =
        await supabase
          .from('chat_messages')
          .insert({
            thread_id: thread!.id,
            sender_id: uid!,
            body,
          });

      if (msgErr) throw msgErr;

      // Update last_message_at
      await supabase
        .from('chat_threads')
        .update({
          last_message_at:
            new Date().toISOString(),
        })
        .eq('id', thread!.id);

      return thread!.id;
    },
    onSuccess: threadId => {
      queryClient.invalidateQueries({
        queryKey: ['messages', threadId],
      });
      queryClient.invalidateQueries({
        queryKey: ['thread', matchId],
      });
    },
  });
};
