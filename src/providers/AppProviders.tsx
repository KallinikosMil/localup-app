import React from 'react';
import { Provider } from 'react-redux';
import { QueryClientProvider } from '@tanstack/react-query';
import { KeyboardProvider } from 'react-native-keyboard-controller';

import Shell from '@providers/Shell';
import AppGuard from '@features/auth/components/AppGuard';
import PushRegistrar from '@features/notifications/components/PushRegistrar';
import { store } from '@store';
import { queryClient } from '@config/queryClient';
import { useAuthSession } from '@features/auth/hooks/useAuthSession';
import { useAuthDeepLink } from '@features/auth/hooks/useAuthDeepLink';
import { useAppFonts } from '@shared/hooks/useAppFonts';
import '@config/i18n';
import { ThemeModeProvider } from '@theme/ThemeModeProvider';

export default function AppProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  const fontsLoaded = useAppFonts();
  useAuthSession();
  // Must live alongside useAuthSession, above the Redux Provider: a
  // recovery link can arrive before any screen has mounted.
  useAuthDeepLink();

  if (!fontsLoaded) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <ThemeModeProvider>
          <PushRegistrar />
          {/* Outermost of the visual providers, and it has to be: it
              installs the listener that reports the REAL IME insets, and
              every KeyboardAwareScrollView below reads from it. Mounted
              once at the root rather than per screen — the native
              listener is a singleton, and a second provider deeper in
              the tree would shadow it with its own. */}
          <KeyboardProvider>
            <Shell>
              <AppGuard>{children}</AppGuard>
            </Shell>
          </KeyboardProvider>
        </ThemeModeProvider>
      </Provider>
    </QueryClientProvider>
  );
}
