import React, { useEffect } from 'react';
import {
  Provider,
  useSelector,
} from 'react-redux';
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
import {
  PaperLight,
  PaperDark,
} from '@theme/paper';
import { supabase } from '@config/supabase';
import {
  setInitialized,
  setUser,
  setOnboardingComplete,
} from '@features/auth/slices/authSlice';
import '@config/i18n';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import {
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';

// Hold the splash until fonts are ready — typography.ts
// references these families by name; rendering before
// they load falls back to system fonts for a frame.
SplashScreen.preventAutoHideAsync().catch(() => {});

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
  const {
    user,
    initialized,
    onboardingComplete,
  } = useSelector(
    (s: RootState) => s.auth,
  );

  useEffect(() => {
    if (!initialized) return;

    const inAuthGroup =
      segments[0] === 'auth';
    const inOnboarding =
      segments[0] === 'onboarding';
    const inDev =
      __DEV__ && segments[0] === 'dev';

    if (inDev) return;

    if (!user && !inAuthGroup) {
      router.replace('/auth/login');
    } else if (user && inAuthGroup) {
      if (onboardingComplete) {
        router.replace('/(tabs)/discover');
      } else {
        router.replace(
          '/onboarding/name-age',
        );
      }
    } else if (
      user &&
      !onboardingComplete &&
      !inOnboarding
    ) {
      router.replace(
        '/onboarding/name-age',
      );
    } else if (
      user &&
      onboardingComplete &&
      inOnboarding
    ) {
      router.replace('/(tabs)/discover');
    }
  }, [
    initialized,
    user,
    onboardingComplete,
    segments,
  ]);

  return <>{children}</>;
}

export default function AppProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(
        () => {},
      );
    }
  }, [fontsLoaded]);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        const session = data.session;
        const user = session?.user
          ? {
              uid: session.user.id,
              email:
                session.user.email ?? null,
            }
          : null;
        store.dispatch(setUser(user));

        if (session?.user) {
          const { data: profile } =
            await supabase
              .from('profiles')
              .select('onboarding_complete')
              .eq('user_id', session.user.id)
              .single();

          store.dispatch(
            setOnboardingComplete(
              profile?.onboarding_complete ??
                false,
            ),
          );
        }

        store.dispatch(
          setInitialized(true),
        );
      });

    const { data: sub } =
      supabase.auth.onAuthStateChange(
        async (_event, session) => {
          const user = session?.user
            ? {
                uid: session.user.id,
                email:
                  session.user.email ?? null,
              }
            : null;
          store.dispatch(setUser(user));

          if (session?.user) {
            const { data: profile } =
              await supabase
                .from('profiles')
                .select(
                  'onboarding_complete',
                )
                .eq('user_id', session.user.id)
                .single();

            store.dispatch(
              setOnboardingComplete(
                profile?.onboarding_complete ??
                  false,
              ),
            );
          } else {
            store.dispatch(
              setOnboardingComplete(false),
            );
          }
        },
      );

    return () => {
      sub?.subscription.unsubscribe();
    };
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <QueryClientProvider
      client={queryClient}
    >
      <Provider store={store}>
        <ThemeModeProvider>
          <Shell>
            <AppGuard>
              {children}
            </AppGuard>
          </Shell>
        </ThemeModeProvider>
      </Provider>
    </QueryClientProvider>
  );
}
