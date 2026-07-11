import React from 'react';
import { Provider } from 'react-redux';
import { QueryClientProvider } from '@tanstack/react-query';
import { store } from '@store';
import { queryClient } from '@config/queryClient';
import { ThemeModeProvider } from '@theme/ThemeModeProvider';
import Shell from '@providers/Shell';
import AppGuard from '@features/auth/components/AppGuard';
import { useAuthSession } from '@features/auth/hooks/useAuthSession';
import { useAppFonts } from '@shared/hooks/useAppFonts';
import '@config/i18n';

// Composition only. The behaviour lives in the pieces:
//   useAppFonts     — fonts + splash
//   useAuthSession  — session restore + auth events (dispatches to the store,
//                     so it runs above the Redux Provider via store.dispatch)
//   Shell           — Paper / StatusBar / SafeAreaView
//   AppGuard        — auth-based routing
export default function AppProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  const fontsLoaded = useAppFonts();
  useAuthSession();

  if (!fontsLoaded) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <ThemeModeProvider>
          <Shell>
            <AppGuard>{children}</AppGuard>
          </Shell>
        </ThemeModeProvider>
      </Provider>
    </QueryClientProvider>
  );
}
