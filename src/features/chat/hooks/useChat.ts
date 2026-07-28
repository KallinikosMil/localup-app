import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@config/supabase';
import { useSelector } from 'react-redux';
import { RootState } from '@store';
import { useForegroundEpoch } from '@shared/hooks/useForegroundEpoch';

export type ChatMessage = {
  id: string;
  sender_id: string;
  body: string | null;
  attachment_url: string | null;
  created_at: string;
};

type ChatData = {
  threadId: string | null;
  messages: ChatMessage[];
};

const MESSAGE_COLS = 'id, sender_id, body, attachment_url, created_at';

// Generous timeout: a Supabase project waking from auto-pause
// cold-starts in ~10-20s. We abort past this so a truly dead
// socket surfaces an error (→ Retry) instead of hanging forever
// (V4 — the reported "infinite loader" is a HANG, not a throw,
// so without this the error branch never renders). retry:1 below
// gives a legitimately-waking DB a second attempt before erroring.
const CHAT_FETCH_TIMEOUT_MS = 15_000;

const byCreatedAtAsc = (a: ChatMessage, b: ChatMessage) =>
  a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0;

// Single hook for the chat screen. Resolves the thread + its
// messages in ONE round trip (P1/§1b fix):
//   - Primary path (threadId known from the Matches nav param):
//     fetch messages directly — the thread lookup is skipped.
//   - Fallback path (deep link / brand-new match with no thread
//     yet): one embedded select returns the thread AND its
//     messages together, instead of the old thread→messages
//     waterfall.
// staleTime keeps a re-opened chat instant from cache (realtime
// keeps it fresh). The screen renders its shell immediately and
// shows loading/error only inside the list — a slow or failed
// fetch can never present as an endless full-screen spinner.
export const useChat = (matchId: string, initialThreadId?: string | null) => {
  const uid = useSelector((s: RootState) => s.auth.user?.uid);
  const queryClient = useQueryClient();
  // Rebuilds both channels below on return to foreground — a chat left
  // open in the background otherwise silently stops receiving messages.
  const foregroundEpoch = useForegroundEpoch();

  const query = useQuery<ChatData>({
    queryKey: ['chat', matchId],
    enabled: !!uid && !!matchId,
    staleTime: 30_000,
    // A hung socket (paused/cold DB) would otherwise spin forever
    // — one retry covers a DB that is mid-wake; past that we let
    // the error surface so the screen's Retry shows (V4).
    retry: 1,
    queryFn: async () => {
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        CHAT_FETCH_TIMEOUT_MS,
      );
      try {
        if (initialThreadId) {
          // 1 RTT — messages only, thread is known.
          const { data, error } = await supabase
            .from('chat_messages')
            .select(MESSAGE_COLS)
            .eq('thread_id', initialThreadId)
            .order('created_at', {
              ascending: true,
            })
            .abortSignal(controller.signal);
          if (error) throw error;
          return {
            threadId: initialThreadId,
            messages: (data ?? []) as ChatMessage[],
          };
        }

        // 1 RTT — embedded thread + messages.
        const { data, error } = await supabase
          .from('chat_threads')
          .select(`id, chat_messages(${MESSAGE_COLS})`)
          .eq('match_id', matchId)
          .abortSignal(controller.signal)
          .maybeSingle();
        if (error) throw error;
        if (!data)
          return {
            threadId: null,
            messages: [],
          };
        const messages = [
          ...((data.chat_messages ?? []) as ChatMessage[]),
        ].sort(byCreatedAtAsc);
        return {
          threadId: data.id,
          messages,
        };
      } finally {
        clearTimeout(timeout);
      }
    },
  });

  const threadId = query.data?.threadId ?? initialThreadId ?? null;

  // Live new messages once the thread is known. Append into the
  // cache (dedup by id) — no refetch.
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
          queryClient.setQueryData<ChatData>(['chat', matchId], old => {
            const next = payload.new as ChatMessage;
            const prev = old ?? {
              threadId,
              messages: [],
            };
            if (prev.messages.some(m => m.id === next.id)) {
              return prev;
            }
            return {
              threadId: prev.threadId ?? threadId,
              messages: [...prev.messages, next],
            };
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [threadId, matchId, queryClient, foregroundEpoch]);

  // While no thread exists yet (neither side has sent), watch for
  // its creation so the recipient's screen fills in when the first
  // message lands.
  useEffect(() => {
    if (threadId || !matchId) return;

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
            queryKey: ['chat', matchId],
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [threadId, matchId, queryClient, foregroundEpoch]);

  return {
    threadId,
    messages: query.data?.messages ?? [],
    // H2: `isPending`, not `isLoading`. RQ v5 computes
    // `isLoading = isPending && isFetching`, so while the query is
    // DISABLED (`enabled: !!uid && !!matchId` — a deep link renders
    // before uid/matchId settle) isLoading is false and the screen
    // showed the "say hi" empty list instead of a spinner. isPending
    // is true for a disabled query, so the shell shows loading until
    // real data (or an error) arrives.
    isLoading: query.isPending,
    isError: query.isError,
    // V10: the screen has to see the ERROR, not just the flag, to tell
    // "you're offline" from "something went wrong".
    error: query.error,
    refetch: query.refetch,
  };
};

export const useSendMessage = (matchId: string) => {
  const uid = useSelector((s: RootState) => s.auth.user?.uid);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: string) => {
      // Get or create thread.
      //
      // W12: the error USED to be discarded here. A failed *read* then
      // looked exactly like "no thread exists" — and the code below
      // reacts to that by INSERTING one. `chat_threads.match_id` has no
      // unique constraint, so the duplicate lands; from then on the read
      // path's .maybeSingle() errors on multiple rows and the chat is
      // permanently broken, with the two users writing into different
      // threads. A failed read must fail, not become a fact.
      let { data: thread, error: threadErr } = await supabase
        .from('chat_threads')
        .select('id')
        .eq('match_id', matchId)
        .maybeSingle();

      if (threadErr) throw threadErr;

      if (!thread) {
        // Look up the match to get
        // traveler/host ids
        const { data: match, error: matchErr } = await supabase
          .from('matches')
          .select('traveler_id, host_id')
          .eq('id', matchId)
          .single();

        if (matchErr) throw matchErr;
        if (!match) throw new Error('Match not found');

        const { data: newThread, error } = await supabase
          .from('chat_threads')
          .insert({
            match_id: matchId,
            traveler_id: match.traveler_id,
            host_id: match.host_id,
          })
          .select('id')
          .single();

        if (error) throw error;
        thread = newThread;
      }

      // Insert message
      const { error: msgErr } = await supabase.from('chat_messages').insert({
        thread_id: thread!.id,
        sender_id: uid!,
        body,
      });

      if (msgErr) throw msgErr;

      // Update last_message_at
      await supabase
        .from('chat_threads')
        .update({
          last_message_at: new Date().toISOString(),
        })
        .eq('id', thread!.id);

      return thread!.id;
    },
    onSuccess: () => {
      // The realtime INSERT appends the sent message; refetch
      // covers the first-message case where the thread was just
      // created (so the cache picks up its id), and reconciles
      // the Matches preview.
      queryClient.invalidateQueries({
        queryKey: ['chat', matchId],
      });
      queryClient.invalidateQueries({
        queryKey: ['matches'],
      });
    },
  });
};
