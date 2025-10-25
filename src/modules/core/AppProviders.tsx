import React, { useEffect } from 'react';
import { Provider, useSelector } from 'react-redux';
import { useRouter, useSegments } from 'expo-router';
import { store, RootState } from './store';
import { ThemeModeProvider, useThemeMode } from '@theme/ThemeModeProvider';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';
import { PaperLight, PaperDark } from './theme';
import { supabase } from './supabase/supabase';
import { setInitialized, setUser } from '../../modules/auth/slices/authSlice';
import './i18n';

function Shell({ children }: { children: React.ReactNode }) {
  const { resolvedMode } = useThemeMode();
  const paper = resolvedMode === 'dark' ? PaperDark : PaperLight;
  const barStyle = resolvedMode === 'dark' ? 'light-content' : 'dark-content';

  return (
    <PaperProvider theme={paper}>
      <SafeAreaProvider>
        <StatusBar barStyle={barStyle} backgroundColor={paper.colors.background} />
        <SafeAreaView style={{ flex: 1, backgroundColor: paper.colors.background }}>
          {children}
        </SafeAreaView>
      </SafeAreaProvider>
    </PaperProvider>
  );
}

function AppGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const { user, initialized } = useSelector((s: RootState) => s.auth);

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

export default function AppProviders({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // ✅ Ανάγνωση session
    supabase.auth.getSession().then(({ data }) => {
      const session = data.session;
      const user = session?.user
        ? { uid: session.user.id, email: session.user.email }
        : null;
      store.dispatch(setUser(user));
      store.dispatch(setInitialized(true));
    });

    // ✅ Συνδρομή σε login/logout changes
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user
        ? { uid: session.user.id, email: session.user.email }
        : null;
      store.dispatch(setUser(user));
    });

    return () => {
      sub?.subscription.unsubscribe();
    };
  }, []);

  return (
    <Provider store={store}>
      <ThemeModeProvider>
        <Shell>
          <AppGuard>{children}</AppGuard>
        </Shell>
      </ThemeModeProvider>
    </Provider>
  );
}
