import React from 'react';
import { Tabs } from 'expo-router';
import { useTheme } from 'react-native-paper';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';

import useLocation from '@shared/hooks/useLocation';
import { useSyncLocation } from '@features/profile/hooks/useProfile';
import { useUnreadMatches } from '@features/matches/hooks/useReadTracking';

export default function TabLayout() {
  const theme = useTheme();
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
          tabBarBadgeStyle: {
            backgroundColor: theme.colors.primary,
            color: theme.colors.onPrimary,
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
