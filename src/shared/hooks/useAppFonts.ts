import { useEffect } from 'react';
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

// Hold the splash until fonts are ready — typography.ts references these
// families by name; rendering before they load falls back to system fonts
// for a frame.
SplashScreen.preventAutoHideAsync().catch(() => {});

// Loads the app's font families and drops the splash once they're ready.
//
// Returns "can we render yet?", which is NOT the same as "did the fonts
// load?". `useFonts` reports failure through its second element, and that
// element used to be ignored: on a failed font asset `fontsLoaded` stays
// false forever, so AppProviders' `if (!fontsLoaded) return null` rendered
// nothing and the splash was never hidden — the app was bricked on the
// splash screen with no error, no retry and no way out.
//
// A missing typeface is a cosmetic problem; a dead app is not. On error we
// carry on and let React Native fall back to the system font. Everything
// still renders, it just looks slightly off — and `typography.ts` only
// names families, so a missing one degrades rather than throwing.
export const useAppFonts = () => {
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const ready = fontsLoaded || !!fontError;

  useEffect(() => {
    if (!ready) return;
    if (fontError && __DEV__) {
      console.warn('[fonts] falling back to system fonts:', fontError);
    }
    SplashScreen.hideAsync().catch(() => {});
  }, [ready, fontError]);

  return ready;
};
