import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';

import { supabase } from '@config/supabase';
import { RootState } from '@store';
import { useForegroundEpoch } from '@shared/hooks/useForegroundEpoch';

export type Match = {
  id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  home_city: string | null;
  // Derived server-side, same rule as the deck: mode_override if the
  // person set one, otherwise home-within-50km-of-here. null when we
  // cannot tell, so the row says nothing rather than guessing.
  match_mode: 'local' | 'traveler' | null;
  // Thread for this match (null until the
  // first message creates it). Passed to the
  // chat screen so it skips the thread lookup
  // (§1b), and used to scope realtime here.
  thread_id: string | null;
  last_message: string | null;
  last_message_at: string | null;
  created_at: string;
  // My own read watermark for this match, null until I first open it.
  // Server-side, so it follows the account and not the handset.
  last_read_at: string | null;
  // Messages from the other person newer than that watermark. Derived by
  // the RPC on every read rather than stored, so it cannot drift.
  unread_count: number;
};

// Mirror the chat fix (U5): a stalled request (network blip, slow
// response, dropped socket) would otherwise leave isLoading true
// forever → infinite spinner. Abort past this so the screen's
// error+Retry branch shows instead of hanging.
const MATCHES_FETCH_TIMEOUT_MS = 15_000;

export const useMatches = () => {
  const uid = useSelector((s: RootState) => s.auth.user?.uid);
  const queryClient = useQueryClient();
  // Rebuilds the channel below whenever the app returns to the
  // foreground — the socket does not survive a long background.
  const foregroundEpoch = useForegroundEpoch();

  const query = useQuery({
    queryKey: ['matches', uid],
    enabled: !!uid,
    queryFn: async () => {
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        MATCHES_FETCH_TIMEOUT_MS,
      );
      try {
        // One server-side JOIN instead of the old 4-RTT client
        // waterfall (matches → profiles → threads → messages).
        // INVOKER RPC → RLS still scopes rows to the caller; its
        // columns map 1:1 onto Match, so no remapping here.
        const { data, error } = await supabase
          .rpc('get_matches_overview')
          .abortSignal(controller.signal);
        if (error) throw error;
        return (data ?? []) as Match[];
      } finally {
        clearTimeout(timeout);
      }
    },
    // Re-opening Matches renders instantly from cache; realtime
    // (below) keeps previews current, so no spinner-on-every-visit
    // (U4-a).
    staleTime: 30_000,
    // A stalled request would otherwise spin forever; one retry
    // covers a transient blip, then the error surfaces → Retry (U5).
    retry: 1,
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
        payload => {
          // Patch only the affected row's preview instead of
          // refetching the whole list on every message (U4-a).
          const msg = payload.new as {
            thread_id: string;
            body: string | null;
            created_at: string;
            sender_id: string | null;
          };
          const cached = queryClient.getQueryData<Match[]>(['matches', uid]);
          const known = cached?.some(m => m.thread_id === msg.thread_id);
          if (!known) {
            // New thread we don't have yet (e.g. first message
            // of a fresh match) — fall back to a refetch.
            queryClient.invalidateQueries({
              queryKey: ['matches', uid],
            });
            return;
          }
          // My own messages are never unread to me. Keeping the count in
          // step here matters because the RPC only recomputes it on a
          // refetch, and this patch exists precisely to avoid one.
          const fromOther = msg.sender_id !== uid;
          queryClient.setQueryData<Match[]>(['matches', uid], old =>
            (old ?? []).map(m =>
              m.thread_id === msg.thread_id
                ? {
                    ...m,
                    last_message: msg.body ?? '',
                    last_message_at: msg.created_at,
                    unread_count: fromOther
                      ? (m.unread_count ?? 0) + 1
                      : m.unread_count,
                  }
                : m,
            ),
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // foregroundEpoch is intentionally a dependency: bumping it tears the
    // channel down through the cleanup above and subscribes a fresh one.
  }, [uid, queryClient, foregroundEpoch]);

  return query;
};
