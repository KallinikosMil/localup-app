// @theme/ThemeModeProvider.tsx
import React, { createContext, useContext, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';

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

  const resolvedMode: 'light' | 'dark' = effective === 'dark' ? 'dark' : 'light';

  const value = useMemo<Ctx>(
    () => ({ mode, setMode, resolvedMode }),
    [mode, resolvedMode]
  );

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export function useThemeMode() {
  const v = useContext(ThemeCtx);
  if (!v) throw new Error('useThemeMode must be used within ThemeModeProvider');
  return v;
}
