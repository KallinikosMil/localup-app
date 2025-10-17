import React, { createContext, useContext, useMemo, useState } from 'react';
import { MD3DarkTheme, MD3LightTheme, PaperProvider } from 'react-native-paper';
import { useColorScheme } from 'react-native';

type Mode = 'light' | 'dark' | 'system';
type Ctx = { mode: Mode; setMode: (m: Mode) => void };

const ThemeModeCtx = createContext<Ctx | null>(null);
export const useThemeMode = () => {
  const v = useContext(ThemeModeCtx);
  if (!v) throw new Error('useThemeMode must be used within ThemeModeProvider');
  return v;
};

export const ThemeModeProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const system = useColorScheme(); // 'light' | 'dark' | null
  const [mode, setMode] = useState<Mode>('system');

  const isDark = mode === 'system' ? system === 'dark' : mode === 'dark';
  const theme = useMemo(() => (isDark ? MD3DarkTheme : MD3LightTheme), [isDark]);

  const value = useMemo(() => ({ mode, setMode }), [mode]);

  return (
    <ThemeModeCtx.Provider value={value}>
      <PaperProvider theme={theme}>{children}</PaperProvider>
    </ThemeModeCtx.Provider>
  );
};
