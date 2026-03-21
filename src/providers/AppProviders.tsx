import React, { useEffect } from 'react';
import { Provider, useSelector } from 'react-redux';
import {
  useRouter,
  useSegments,
} from 'expo-router';
import {
  QueryClientProvider,
} from '@tanstack/react-query';
import { store, RootState } from '@store';
import { queryClient } from '@config/queryClient';
import {
  ThemeModeProvider,
  useThemeMode,
} from '@theme/ThemeModeProvider';
import { PaperProvider } from 'react-native-paper';
import {
  SafeAreaProvider,
  SafeAreaView,
} from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';
import { PaperLight, PaperDark } from '@theme/paper';
import { supabase } from '@config/supabase';
import {
  setInitialized,
  setUser,
} from '@features/auth/slices/authSlice';
import '@config/i18n';

function Shell({
  children,
}: {
  children: React.ReactNode;
}) {
  const { resolvedMode } = useThemeMode();
  const paper =
    resolvedMode === 'dark'
      ? PaperDark
      : PaperLight;
  const barStyle =
    resolvedMode === 'dark'
      ? 'light-content'
      : 'dark-content';

  return (
    <PaperProvider theme={paper}>
      <SafeAreaProvider>
        <StatusBar
          barStyle={barStyle}
          backgroundColor={
            paper.colors.background
          }
        />
        <SafeAreaView
          style={{
            flex: 1,
            backgroundColor:
              paper.colors.background,
          }}
        >
          {children}
        </SafeAreaView>
      </SafeAreaProvider>
    </PaperProvider>
  );
}

function AppGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const segments = useSegments();
  const { user, initialized } = useSelector(
    (s: RootState) => s.auth,
  );

  useEffect(() => {
    if (!initialized) return;

    const inAuthGroup = segments[0] === 'auth';

    if (!user && !inAuthGroup) {
      router.replace('/auth/login');
    } else if (user && inAuthGroup) {
      router.replace('/dashboard');
    }
  }, [initialized, user, segments]);

  return <>{children}</>;
}

export default function AppProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => {
        const session = data.session;
        const user = session?.user
          ? {
              uid: session.user.id,
              email:
                session.user.email ?? null,
            }
          : null;
        store.dispatch(setUser(user));
        store.dispatch(setInitialized(true));
      });

    const { data: sub } =
      supabase.auth.onAuthStateChange(
        (_event, session) => {
          const user = session?.user
            ? {
                uid: session.user.id,
                email:
                  session.user.email ?? null,
              }
            : null;
          store.dispatch(setUser(user));
        },
      );

    return () => {
      sub?.subscription.unsubscribe();
    };
  }, []);

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
