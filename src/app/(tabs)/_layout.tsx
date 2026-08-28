import React from 'react';
import { Tabs } from 'expo-router';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';

import useLocation from '@shared/hooks/useLocation';
import { useSyncLocation } from '@features/profile/hooks/useProfile';
import { useUnreadMatches } from '@features/matches/hooks/useReadTracking';
import FloatingTabBar from '@shared/components/FloatingTabBar';
import { Translations as Discover } from '@features/discover/i18n/translationKeys';
import { Translations as Matches } from '@features/matches/i18n/translationKeys';
import { Translations as Profile } from '@features/profile/i18n/translationKeys';

export default function TabLayout() {
  // FloatingTabBar reads options.title for both the visible pill text and
  // every tab's accessibilityLabel, so a literal here left the whole bar
  // in English — on screen and to a screen reader.
  const { t } = useTranslation();
  const { latitude, longitude } = useLocation();
  useSyncLocation(latitude, longitude);

  // Live count of matches with an unseen new match or new message. Driven
  // here (tab root) so it stays current app-wide via the matches realtime
  // subscription; clears as chats are opened.
  const { count: unreadCount } = useUnreadMatches();

  return (
    // The redesign floats the bar OVER the content instead of docking
    // it, so the hero photo can run to the bottom edge. Colours, the
    // active pill and the badge all live in FloatingTabBar now — the
    // tabBar* screenOptions no longer apply to anything.
    <Tabs
      tabBar={props => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="discover"
        options={{
          title: t(Discover.DISCOVER_TAB_TITLE),
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
          title: t(Matches.MATCHES_TITLE),
          // undefined (not 0) so the badge disappears entirely when there
          // is nothing unread, rather than showing a "0".
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          // tabBarBadgeStyle is gone: FloatingTabBar draws the badge
          // itself, in the brand gradient with a ring the colour of the
          // bar behind it. The old style existed to stop a `primary`
          // badge from disappearing into the `primary` active tint — the
          // gradient plus the ring solves that on both themes without
          // needing a second colour pair.
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
          title: t(Profile.PROFILE_TITLE),
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
