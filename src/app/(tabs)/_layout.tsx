import React from 'react';
import { Tabs } from 'expo-router';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';

import useLocation from '@shared/hooks/useLocation';
import { useSyncLocation } from '@features/profile/hooks/useProfile';
import { useUnreadMatches } from '@features/matches/hooks/useReadTracking';
import { useAppTheme } from '@theme/paper';

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
          // The container tone, NOT `primary`: the active tab tint IS
          // `primary`, so a primary badge sat on the active tab in the
          // exact colour of the icon under it and stopped reading as a
          // separate "something wants you" marker.
          //
          // primaryContainer/onPrimaryContainer is a designed pair, so it
          // stays legible in both themes on its own — pale lilac with a
          // deep violet numeral in light, deep violet with a pale numeral
          // in dark. It also never collides with the tint in EITHER mode,
          // which a mid-light violet would: dark-mode `primary` is itself
          // a light violet (#D0BCFF), so #CCC2FF would read as the same
          // colour there.
          tabBarBadgeStyle: {
            backgroundColor: theme.colors.primaryContainer,
            color: theme.colors.onPrimaryContainer,
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
