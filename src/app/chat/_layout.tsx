import { Stack } from 'expo-router';

import ScreenSafeArea from '@shared/components/ScreenSafeArea';

export default function ChatLayout() {
  return (
    // The app-level SafeAreaView is gone (see Shell) so the redesign's
    // full-bleed screens can reach the edges. Chat still wants the inset,
    // and taking it here covers every route in the group at once.
    <ScreenSafeArea>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      />
    </ScreenSafeArea>
  );
}
