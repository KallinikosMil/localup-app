// @theme/ThemeModeProvider.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useColorScheme } from 'react-native';
import * as SystemUI from 'expo-system-ui';

import { PaperLight, PaperDark } from '@theme/paper';

type Mode = 'light' | 'dark' | 'system';

type Ctx = {
  mode: Mode;
  setMode: React.Dispatch<React.SetStateAction<Mode>>;
  resolvedMode: 'light' | 'dark';
};

const ThemeCtx = createContext<Ctx | null>(null);

export function ThemeModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<Mode>('system');
  const system = useColorScheme(); // 'light' | 'dark' | null

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

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export function useThemeMode() {
  const v = useContext(ThemeCtx);
  if (!v) throw new Error('useThemeMode must be used within ThemeModeProvider');
  return v;
}
