import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSelector } from 'react-redux';
import { RootState } from '@store';
import { useMatches, type Match } from '@features/matches/hooks/useMatches';

// matchId → epoch ms the user last opened that chat.
type ReadMap = Record<string, number>;

// There is no server-side read state (no last_read_at / read receipts),
// so "have I seen this?" is tracked locally per user. This is a
// single-device MVP: it does not sync across devices and does not feed
// push. The scale version is a server `last_read_at` column + RPC, which
// is also what push notifications will need — swap this hook's storage
// for that when push lands, the call sites stay the same.
const storageKey = (uid: string) => `localup:matchReads:${uid}`;
const readMapKey = (uid?: string) => ['match-reads', uid];

// The instant a match last had activity: its newest message, or — for a
// brand-new match with no messages yet — when the match itself was made.
// A match stays unread until it has been opened AFTER this instant, so
// both "new match" and "new message" light the badge with one rule.
const activityAt = (m: Match) =>
  new Date(m.last_message_at ?? m.created_at).getTime();

// The persisted read map, exposed reactively via React Query so the tab
// badge and the list re-render the moment a chat is opened.
export const useReadMap = () => {
  const uid = useSelector((s: RootState) => s.auth.user?.uid);
  return useQuery({
    queryKey: readMapKey(uid),
    enabled: !!uid,
    queryFn: async (): Promise<ReadMap> => {
      const raw = await AsyncStorage.getItem(storageKey(uid as string));
      return raw ? (JSON.parse(raw) as ReadMap) : {};
    },
    // We own this data locally and mutate the cache directly on write, so
    // it never needs refetching.
    staleTime: Infinity,
    gcTime: Infinity,
  });
};

// Marks a match read up to `at` (default now). Patches the React Query
// cache first (instant badge clear) then persists. Never moves a read
// timestamp backwards.
export const useMarkMatchRead = () => {
  const uid = useSelector((s: RootState) => s.auth.user?.uid);
  const queryClient = useQueryClient();
  return useCallback(
    async (matchId: string, at: number = Date.now()) => {
      if (!uid) return;
      const key = readMapKey(uid);
      const prev = queryClient.getQueryData<ReadMap>(key) ?? {};
      if ((prev[matchId] ?? 0) >= at) return;
      const next = { ...prev, [matchId]: at };
      queryClient.setQueryData<ReadMap>(key, next);
      try {
        await AsyncStorage.setItem(storageKey(uid), JSON.stringify(next));
      } catch {
        // Best-effort: the in-memory cache already reflects the read, so
        // the badge is correct for this session even if the disk write
        // fails; it just won't survive a cold start.
      }
    },
    [uid, queryClient],
  );
};

// The reactive unread view for the tab badge and the list rows.
export const useUnreadMatches = () => {
  const { data: matches } = useMatches();
  const { data: readMap } = useReadMap();

  const isUnread = useCallback(
    (m: Match) => activityAt(m) > (readMap?.[m.id] ?? 0),
    [readMap],
  );

  const unreadIds = (matches ?? []).filter(isUnread).map(m => m.id);
  return {
    count: unreadIds.length,
    unreadIds: new Set(unreadIds),
    isUnread,
  };
};
