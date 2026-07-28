import React from 'react';
import { Tabs } from 'expo-router';
import { useAppTheme } from '@theme/paper';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';

import useLocation from '@shared/hooks/useLocation';
import { useSyncLocation } from '@features/profile/hooks/useProfile';
import { useUnreadMatches } from '@features/matches/hooks/useReadTracking';

export default function TabLayout() {
  const theme = useAppTheme();
  const { latitude, longitude } = useLocation();
  useSyncLocation(latitude, longitude);

  // Live count of matches with an unseen new match or new message. Driven
  // here (tab root) so it stays current app-wide via the matches realtime
  // subscription; clears as chats are opened.
  const { count: unreadCount } = useUnreadMatches();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.outlineVariant,
        },
      }}
    >
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Discover',
          tabBarIcon: ({ color, size, focused }) => (
            <Icon
              name={focused ? 'compass' : 'compass-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="matches"
        options={{
          title: 'Matches',
          // undefined (not 0) so the badge disappears entirely when there
          // is nothing unread, rather than showing a "0".
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          // Amber, NOT primary: the active tab tint is `primary`, so a
          // primary badge sat on the active tab as the same colour and
          // stopped reading as "something wants you". Amber is the app's
          // only warm accent — it can never collide with the tint, and it
          // doesn't carry the "reject" meaning red has here (`pass`).
          //
          // Amber is LIGHT in both themes (#F59E0B / #FFD740), so the
          // label must be DARK in both — the mirror of ModeBadge's flip.
          // `onSurface` is dark only in light mode, `background` only in
          // dark mode; picking per theme keeps the number legible in both
          // (white-on-amber would be ~2:1 and unreadable).
          tabBarBadgeStyle: {
            backgroundColor: theme.colors.warning,
            color: theme.dark
              ? theme.colors.background
              : theme.colors.onSurface,
            fontWeight: '700',
          },
          tabBarIcon: ({ color, size, focused }) => (
            <Icon
              name={focused ? 'chat' : 'chat-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size, focused }) => (
            <Icon
              name={focused ? 'account' : 'account-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
