import React from 'react';
import { Tabs } from 'expo-router';
import { useTheme } from 'react-native-paper';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';

import useLocation from
  '@shared/hooks/useLocation';
import { useSyncLocation } from
  '@features/profile/hooks/useProfile';

export default function TabLayout() {
  const theme = useTheme();
  const { latitude, longitude } =
    useLocation();
  useSyncLocation(latitude, longitude);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor:
          theme.colors.primary,
        tabBarInactiveTintColor:
          theme.colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor:
            theme.colors.surface,
          borderTopColor:
            theme.colors.outlineVariant,
        },
      }}
    >
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Discover',
          tabBarIcon: ({
            color,
            size,
            focused,
          }) => (
            <Icon
              name={
                focused
                  ? 'compass'
                  : 'compass-outline'
              }
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
          tabBarIcon: ({
            color,
            size,
            focused,
          }) => (
            <Icon
              name={
                focused
                  ? 'chat'
                  : 'chat-outline'
              }
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
          tabBarIcon: ({
            color,
            size,
            focused,
          }) => (
            <Icon
              name={
                focused
                  ? 'account'
                  : 'account-outline'
              }
              size={size}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
