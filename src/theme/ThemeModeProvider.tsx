// @theme/ThemeModeProvider.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SystemUI from 'expo-system-ui';

import { PaperLight, PaperDark } from '@theme/paper';

type Mode = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'localup.themeMode';

// Anything else in storage is not a mode — a truncated write, or a key
// this app used to mean something different. Fall back to the default
// rather than trusting the string into a union it may not belong to.
const isMode = (v: string | null): v is Mode =>
  v === 'light' || v === 'dark' || v === 'system';

type Ctx = {
  mode: Mode;
  setMode: React.Dispatch<React.SetStateAction<Mode>>;
  resolvedMode: 'light' | 'dark';
};

const ThemeCtx = createContext<Ctx | null>(null);

export function ThemeModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<Mode>('system');
  // Whether the stored choice has been read yet. Until it has, we do not
  // know what theme this user picked, and we must not write either.
  const [hydrated, setHydrated] = useState(false);
  const system = useColorScheme(); // 'light' | 'dark' | null

  // The choice used to live only in this useState, so it was forgotten on
  // every restart: you set dark, killed the app, and it came back
  // following the system again. A preference that does not survive the
  // process is not a preference.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (!cancelled && isMode(stored)) setMode(stored);
      } catch {
        // Storage being unreadable is not worth failing a launch over —
        // the default is a perfectly good theme.
      } finally {
        if (!cancelled) setHydrated(true);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    // NOT before hydration, or this fires once with the initial 'system'
    // and overwrites the stored choice before it has been read.
    if (!hydrated) return;
    AsyncStorage.setItem(STORAGE_KEY, mode).catch(() => {});
  }, [hydrated, mode]);

  // Ensure we never pass null/undefined to the union
  const effective: 'light' | 'dark' =
    mode === 'system' ? (system ?? 'light') : mode; // fallback to 'light' if null

  const resolvedMode: 'light' | 'dark' =
    effective === 'dark' ? 'dark' : 'light';

  // W1: under Android edge-to-edge (edgeToEdgeEnabled) the transparent
  // system nav bar reveals the ROOT WINDOW background, which defaults
  // to white — a white strip below the app in dark mode. On Android 15
  // you can't paint the nav bar itself (expo-navigation-bar bg is a
  // no-op); you set the window background so the transparent bar shows
  // the theme colour. Run on mount (so the FIRST frame is correct — the
  // bug only "fixed" itself after an app-switch re-render) and on every
  // mode change. No-op-safe on iOS. expo-system-ui is a bundled Expo
  // module, so this works in Expo Go with no dev build.
  useEffect(() => {
    const bg = (resolvedMode === 'dark' ? PaperDark : PaperLight).colors
      .background;
    SystemUI.setBackgroundColorAsync(bg).catch(() => {});
  }, [resolvedMode]);

  const value = useMemo<Ctx>(
    () => ({ mode, setMode, resolvedMode }),
    [mode, resolvedMode],
  );

  // Hold the first frame until the stored mode is known. Rendering the
  // default first and correcting it a tick later means every cold start
  // flashes the wrong theme — which is more noticeable than the few
  // milliseconds an AsyncStorage read costs behind the splash screen.
  if (!hydrated) return null;

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export function useThemeMode() {
  const v = useContext(ThemeCtx);
  if (!v) throw new Error('useThemeMode must be used within ThemeModeProvider');
  return v;
}
