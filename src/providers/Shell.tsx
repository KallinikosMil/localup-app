import React from 'react';
import { StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  ThemeProvider as NavigationThemeProvider,
  DefaultTheme as NavigationLight,
  DarkTheme as NavigationDark,
} from '@react-navigation/native';

import { useThemeMode } from '@theme/ThemeModeProvider';
import { PaperLight, PaperDark } from '@theme/paper';

export default function Shell({ children }: { children: React.ReactNode }) {
  const { resolvedMode } = useThemeMode();
  const paper = resolvedMode === 'dark' ? PaperDark : PaperLight;
  const barStyle = resolvedMode === 'dark' ? 'light-content' : 'dark-content';

  // React Navigation paints the card BEHIND every screen, and nothing was
  // ever telling it our colours — so it kept its own default, whose `card`
  // is literally rgb(255,255,255).
  //
  // Most of the time no one sees it, because each screen paints itself
  // over the top. It shows wherever a screen stops short of the edge: the
  // strip a dismissed keyboard leaves behind, reported as "the white came
  // back". That is a DIFFERENT white from the one SystemUI fixes in
  // ThemeModeProvider — that one is the window under the nav bar, this one
  // is the navigator's card under the screen. Two layers, two fixes, and
  // the first never covered the second.
  //
  // Spread rather than build from scratch: v7 themes also carry `fonts`,
  // and a theme missing it crashes the header renderers.
  const navigation = React.useMemo(() => {
    const base = resolvedMode === 'dark' ? NavigationDark : NavigationLight;
    return {
      ...base,
      dark: resolvedMode === 'dark',
      colors: {
        ...base.colors,
        background: paper.colors.background,
        card: paper.colors.background,
        text: paper.colors.onBackground,
        border: paper.colors.outlineVariant,
        primary: paper.colors.primary,
      },
    };
  }, [resolvedMode, paper]);

  return (
    <PaperProvider theme={paper}>
      <SafeAreaProvider>
        <StatusBar
          barStyle={barStyle}
          backgroundColor={paper.colors.background}
        />
        {/* NOT a SafeAreaView. This used to inset every screen in the
            app, which makes an edge-to-edge screen impossible — a child
            cannot opt out of its parent's padding, and the redesign's
            hero has to run under the status bar. The inset is per-screen
            now: see ScreenSafeArea. The background stays here so the
            areas behind the system bars are painted.

            GestureHandlerRootView lives here, once, because that is what
            react-native-gesture-handler requires of ANY GestureDetector
            in the tree. It used to be on Discover alone, so the first
            gesture added to a second screen — the photo grid on Edit —
            crashed the render. A root is a root. */}
        <GestureHandlerRootView
          style={{
            flex: 1,
            backgroundColor: paper.colors.background,
          }}
        >
          <NavigationThemeProvider value={navigation}>
            {children}
          </NavigationThemeProvider>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </PaperProvider>
  );
}
