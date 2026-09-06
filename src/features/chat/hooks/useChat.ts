import { useEffect } from 'react';
import { useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';

import { supabase } from '@config/supabase';
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

  // Messages that arrived over realtime, kept OUTSIDE the query cache.
  //
  // Writing them straight in with setQueryData is not enough: react-query
  // does not merge a manual write with an in-flight fetch, so when that
  // fetch resolves it replaces the cache wholesale and the message
  // vanishes. Refetches here are routine — every send invalidates this
  // key, and returning to foreground refetches it — so the window is wide
  // open, and nothing re-reads afterwards.
  //
  // Holding them here and merging on the way out survives any number of
  // replacements. Capped so a long-lived screen cannot grow without
  // bound; correctness comes from the id dedupe, not the cap.
  const liveRef = useRef<Map<string, ChatMessage>>(new Map());

  // One failure-refetch per channel LIFETIME. Reset when the channel is
  // rebuilt (new thread, or return to foreground), because that is a
  // genuinely new attempt that deserves its own one shot.
  const refetchedOnFailure = useRef(false);

  const query = useQuery<ChatData>({
    queryKey: ['chat', matchId],
    enabled: !!uid && !!matchId,
    staleTime: 30_000,
    // ALWAYS reconcile with the server when the screen opens, even inside
    // the staleTime window.
    //
    // Reported as: a notification says a message arrived, the chat is
    // opened, and it is not there — until you send something yourself, at
    // which point the missing ones appear all at once. That is this line
    // missing. React Query refetches on mount only when the query is
    // STALE, so re-entering a chat within 30s served pure cache, and the
    // comment above this block was relying on realtime to have filled the
    // gap. When the channel is dead, nothing does; the send is the first
    // thing that invalidates and the backlog lands then.
    //
    // staleTime stays: it still stops re-render storms from refetching.
    // What changes is that opening the screen is no longer one of the
    // things it suppresses. Realtime is an optimisation — correctness
    // cannot depend on a websocket that is allowed to fail.
    refetchOnMount: 'always',
    // Merge, do not trust. Anything realtime delivered that this payload
    // does not contain is added back and the whole list re-sorted — the
    // append path never sorted, so an out-of-order arrival used to sit at
    // the bottom regardless of its timestamp.
    select: (data: ChatData): ChatData => {
      if (liveRef.current.size === 0) return data;
      const known = new Set(data.messages.map(m => m.id));
      const extras = [...liveRef.current.values()].filter(
        m => !known.has(m.id),
      );
      if (extras.length === 0) return data;
      return {
        ...data,
        messages: [...data.messages, ...extras].sort(byCreatedAtAsc),
      };
    },
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
    refetchedOnFailure.current = false;

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
          const next = payload.new as ChatMessage;
          liveRef.current.set(next.id, next);
          // Oldest out first, so the cap trims history rather than the
          // message that just arrived.
          if (liveRef.current.size > 100) {
            const oldest = liveRef.current.keys().next().value;
            if (oldest) liveRef.current.delete(oldest);
          }
          queryClient.setQueryData<ChatData>(['chat', matchId], old => {
            const prev = old ?? {
              threadId,
              messages: [],
            };
            if (prev.messages.some(m => m.id === next.id)) {
              return prev;
            }
            return {
              threadId: prev.threadId ?? threadId,
              messages: [...prev.messages, next].sort(byCreatedAtAsc),
            };
          });
        },
      )
      // A channel that never subscribes used to fail in total silence: no
      // log, no retry, and a screen that quietly stops receiving. The
      // status callback is the only place that failure is observable.
      //
      // On failure, refetch ONCE — and the once is load-bearing.
      // realtime-js never gives up: a rejected join is retried at 1s, 2s,
      // 5s, 10s and then every 10s for as long as the screen is open, and
      // EVERY attempt reports CHANNEL_ERROR here. Without the guard, a
      // websocket blocked by a proxy turned into an unbounded stream of
      // chat_messages fetches for the whole visit. One refetch gets the
      // person the messages that exist now; nothing more is gained by
      // repeating it.
      .subscribe(status => {
        if (__DEV__) console.log('[chat] messages channel', status);
        if (
          (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') &&
          !refetchedOnFailure.current
        ) {
          refetchedOnFailure.current = true;
          queryClient.invalidateQueries({ queryKey: ['chat', matchId] });
        }
      });

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
