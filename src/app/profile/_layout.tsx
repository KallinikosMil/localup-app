import React from 'react';
import { Stack } from 'expo-router';

// No ScreenSafeArea here any more. It covered both routes in this group,
// which was fine while both were ordinary pages — but /profile/[userId]
// is a full-bleed hero now and a parent inset makes that impossible. The
// inset moved into /profile/edit, which is the only route in the group
// that still wants one.
export default function ProfileDetailLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}
