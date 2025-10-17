import { useMemo, useState, createContext, useContext } from "react";
import { Stack } from "expo-router";
import { MD3DarkTheme, MD3LightTheme, PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { lightColors, darkColors } from "../ui/theme/colors";

type ThemeMode = "light" | "dark";
type ThemeCtx = { mode: ThemeMode; setMode: (m: ThemeMode) => void };
const ThemeModeContext = createContext<ThemeCtx | undefined>(undefined);
export const useThemeMode = () => {
  const ctx = useContext(ThemeModeContext);
  if (!ctx) throw new Error("useThemeMode must be used within ThemeModeProvider");
  return ctx;
};

export default function RootLayout() {
  const [mode, setMode] = useState<ThemeMode>("light");
  const theme = useMemo(() => (
    mode === "dark"
      ? { ...MD3DarkTheme, colors: { ...MD3DarkTheme.colors, ...darkColors } }
      : { ...MD3LightTheme, colors: { ...MD3LightTheme.colors, ...lightColors } }
  ), [mode]);

  return (
    <SafeAreaProvider>
      <ThemeModeContext.Provider value={{ mode, setMode }}>
        <PaperProvider theme={theme}>
          <Stack screenOptions={{ headerShown: false }} />
        </PaperProvider>
      </ThemeModeContext.Provider>
    </SafeAreaProvider>
  );
}
