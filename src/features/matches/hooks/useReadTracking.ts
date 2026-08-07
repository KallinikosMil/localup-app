import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';

import { supabase } from '@config/supabase';
import { RootState } from '@store';
import { useMatches, type Match } from '@features/matches/hooks/useMatches';

// Read state lives on the server now (`public.match_reads`), so it follows
// the account rather than the handset, and a notification service can ask
// the same question the badge asks. What is stored is a WATERMARK — the
// instant you last opened the chat — not a counter: writes are idempotent
// and monotonic, and the count is re-derived from the messages themselves
// by get_matches_overview. A counter would have to be incremented by every
// writer and zeroed by every reader, and drifts permanently the first time
// a path is missed.
//
// There is deliberately no "mark unread": the table has no DELETE policy
// and a BEFORE UPDATE trigger clamps the timestamp so it can never move
// backwards.

// The instant a match last had activity: its newest message, or — for a
// brand-new match with no messages yet — when the match itself was made.
// A match stays unread until it has been opened AFTER this instant, so
// both "new match" and "new message" light the badge with one rule.
const activityAt = (m: Match) =>
  new Date(m.last_message_at ?? m.created_at).getTime();

// No row means never opened, which must read as "older than everything".
const readAt = (m: Match) =>
  m.last_read_at ? new Date(m.last_read_at).getTime() : 0;

// Marks a match read up to `at` (default now). Patches the matches cache
// first so the badge clears on the tap rather than on the round trip.
export const useMarkMatchRead = () => {
  const uid = useSelector((s: RootState) => s.auth.user?.uid);
  const queryClient = useQueryClient();
  return useCallback(
    async (matchId: string, at: number = Date.now()) => {
      if (!uid) return;
      const key = ['matches', uid];
      const cached = queryClient.getQueryData<Match[]>(key) ?? [];
      const target = cached.find(m => m.id === matchId);
      // Already read this far — skip the write entirely. The trigger would
      // clamp it anyway, but not spending the round trip is better.
      if (target && readAt(target) >= at) return;

      const iso = new Date(at).toISOString();
      queryClient.setQueryData<Match[]>(key, old =>
        (old ?? []).map(m =>
          m.id === matchId ? { ...m, last_read_at: iso, unread_count: 0 } : m,
        ),
      );

      const { error } = await supabase
        .from('match_reads')
        .upsert(
          { match_id: matchId, user_id: uid, last_read_at: iso },
          { onConflict: 'match_id,user_id' },
        );

      if (error) {
        // The optimistic patch above claimed something the server never
        // accepted. Local storage could shrug that off; a server watermark
        // cannot, or the badge stays cleared on every device forever — so
        // pull the real state back.
        queryClient.invalidateQueries({ queryKey: key });
      }
    },
    [uid, queryClient],
  );
};

// The reactive unread view for the tab badge and the list rows. It reads
// straight off the matches query — the watermark and the count now arrive
// with the list, so there is no second request to keep in step with it.
export const useUnreadMatches = () => {
  const { data: matches } = useMatches();

  const isUnread = useCallback((m: Match) => activityAt(m) > readAt(m), []);

  const unreadIds = (matches ?? []).filter(isUnread).map(m => m.id);
  return {
    // Matches needing attention — what the tab badge shows.
    count: unreadIds.length,
    unreadIds: new Set(unreadIds),
    isUnread,
    // Unread MESSAGES across every match. Not shown anywhere yet; this is
    // the number a push notification's app-icon badge wants.
    messageCount: (matches ?? []).reduce(
      (total, m) => total + (m.unread_count ?? 0),
      0,
    ),
  };
};
